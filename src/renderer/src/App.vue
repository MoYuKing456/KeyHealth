<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import KeyboardView from './components/KeyboardView.vue'
import CreateRecordModal from './components/CreateRecordModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import SelectLayoutModal from './components/SelectLayoutModal.vue'
import DeleteRecordModal from './components/DeleteRecordModal.vue'
import { EventType, KeyStatus, type KeyboardHealthRecord, type KeyHealth, type KeyboardLayoutType } from './types'
import { getKeyboardLayout, getLayoutKeyCodes, buildKeyLabelMap, getDisabledLayoutReasons, layoutOptions } from './data/keyboardLayout'

// 主题 — 从预加载脚本同步初始状态（已由 index.html 内联脚本提前应用到 DOM）
const isDark = ref(window.__INITIAL_THEME__ === 'dark')

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  initUserData()
})

// 持久化应用配置（主题 + 上次选中的记录），两者一起保存避免互相覆盖
const saveAppConfig = async () => {
  try {
    await window.api.saveConfig({
      _type: 'app-config',
      _version: '1.0.0',
      theme: isDark.value ? 'dark' : 'light',
      lastRecordId: currentRecordId.value
    })
  } catch (err) {
    console.warn('[配置] 保存配置失败', err)
  }
}

// 主题切换时持久化保存
watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
  saveAppConfig()
})

// 所有键盘健康记录
const records = ref<KeyboardHealthRecord[]>([])

// 当前选中的记录 ID
const currentRecordId = ref<string>('')

// 编辑模式
const isEditMode = ref(false)

// 测试模式（按键可视化 + 按下次数统计；退出后清空，不做本地保存）
const isTestMode = ref(false)
// 测试时隐藏已记录的损坏/更换状态颜色（默认开启，保证按下反馈清晰）
const testHideStatus = ref(true)
// 当前按住的键（event.code -> true）
const testPressed = reactive<Record<string, boolean>>({})
// 本次测试各键的按下次数
const testPressCounts = reactive<Record<string, number>>({})
// 本次测试总按下次数
const testTotalCount = computed(() =>
  Object.values(testPressCounts).reduce((sum, n) => sum + n, 0)
)
// 当前布局的全部键位（用于过滤物理按键事件）
const layoutKeyCodes = computed(() => {
  if (!currentRecord.value) return new Set<string>()
  return new Set(getLayoutKeyCodes(getKeyboardLayout(currentLayout.value)))
})

// 模态框状态
const showCreateModal = ref(false)
const showConfirmModal = ref(false)

// 删除记录确认模态框状态
const showDeleteModal = ref(false)
const recordToDelete = ref<KeyboardHealthRecord | null>(null)

// 下拉框展开状态
const isDropdownOpen = ref(false)

// 待保存的编辑记录
const pendingChanges = reactive<Record<string, KeyHealth>>({})
const hasChanges = ref(false)

// 本次编辑会话的操作日志：每次点击/换轴都记录一条，用于保存时的修改概要，
// 避免同一按键多次操作被最终状态覆盖（如 损坏→更换→再次损坏 只显示最后一种）。
type ChangeType = 'damaged' | 'redamaged' | 'replaced' | 'healed'
interface ChangeOp {
  keyCode: string
  type: ChangeType
}
const changeLog = ref<ChangeOp[]>([])

// 排行视图切换
const showRanking = ref(false)

// 构建 keyCode → label 的查找表（按当前记录的布局）
const keyLabelMap = computed(() => {
  const type = currentRecord.value?.layout || '104'
  return buildKeyLabelMap(getKeyboardLayout(type))
})

// 排行数据：按损坏次数降序排列
const rankingData = computed(() => {
  if (!currentRecord.value) return []

  return Object.entries(displayKeys.value)
    .filter(([_, health]) => health.history && health.history.length > 0)
    .map(([keyCode, health]) => ({
      keyCode,
      label: getRankingLabel(keyCode, keyLabelMap.value[keyCode] || keyCode),
      count: health.history.length,
      status: health.status
    }))
    .sort((a, b) => b.count - a.count)
})

/**
 * 为排行视图生成可区分的标签（区分左右键、小键盘等）
 */
function getRankingLabel(keyCode: string, baseLabel: string): string {
  // ShiftLeft / ShiftRight → Shift L / Shift R
  if (keyCode === 'ShiftLeft') return 'Shift L'
  if (keyCode === 'ShiftRight') return 'Shift R'
  // ControlLeft / ControlRight → Ctrl L / Ctrl R
  if (keyCode === 'ControlLeft') return 'Ctrl L'
  if (keyCode === 'ControlRight') return 'Ctrl R'
  // AltLeft / AltRight → Alt L / Alt R
  if (keyCode === 'AltLeft') return 'Alt L'
  if (keyCode === 'AltRight') return 'Alt R'
  // MetaLeft / MetaRight → Win L / Win R
  if (keyCode === 'MetaLeft') return 'Win L'
  if (keyCode === 'MetaRight') return 'Win R'
  // 小键盘数字
  if (/^Numpad\d$/.test(keyCode)) return `Num ${keyCode.slice(-1)}`
  // 小键盘运算符
  if (keyCode === 'NumpadAdd') return 'Num +'
  if (keyCode === 'NumpadSubtract') return 'Num -'
  if (keyCode === 'NumpadMultiply') return 'Num *'
  if (keyCode === 'NumpadDivide') return 'Num /'
  if (keyCode === 'NumpadDecimal') return 'Num .'
  if (keyCode === 'NumpadEnter') return 'Num Enter'
  // 默认使用基础标签
  return baseLabel
}

// 排行最大值（用于比例计算）
const maxRankCount = computed(() => {
  if (rankingData.value.length === 0) return 1
  return rankingData.value[0].count
})

// 当前选中的记录
const currentRecord = computed(() => {
  return records.value.find(r => r.id === currentRecordId.value)
})

// 当前记录的键盘布局（旧数据缺失或非法 layout 时默认 104）
const VALID_LAYOUTS: KeyboardLayoutType[] = ['104', '98', '87']
const isLayoutValid = (type?: KeyboardLayoutType): type is KeyboardLayoutType =>
  !!type && (VALID_LAYOUTS as string[]).includes(type)

const currentLayout = computed<KeyboardLayoutType>(() => {
  const type = currentRecord.value?.layout
  return isLayoutValid(type) ? type : '104'
})

// 布局选择模态框状态（旧数据适配 / 手动更换布局）
const showSelectLayoutModal = ref(false)
const layoutModalRecord = ref<KeyboardHealthRecord | null>(null)
const layoutModalPreselect = ref<KeyboardLayoutType>('104')

// 打开布局选择模态框
const openSelectLayoutModal = (record: KeyboardHealthRecord) => {
  layoutModalRecord.value = record
  layoutModalPreselect.value = isLayoutValid(record.layout) ? record.layout : '104'
  showSelectLayoutModal.value = true
}

// 检测旧数据：记录缺少（或非法）layout 时提示用户手动选择
const checkLayoutForRecord = (id: string) => {
  const record = records.value.find(r => r.id === id)
  if (record && !isLayoutValid(record.layout)) {
    openSelectLayoutModal(record)
  }
}

// 选择并保存布局
const handleSelectLayout = async (layout: KeyboardLayoutType) => {
  const record = layoutModalRecord.value
  if (!record) return
  record.layout = layout
  record.updatedAt = new Date().toISOString()
  const payload = JSON.parse(JSON.stringify(record))
  try {
    await window.api.updateRecord(payload)
    console.log('[布局已保存]', record.name, layout)
  } catch (err) {
    console.error('[布局保存失败]', err)
  }
  showSelectLayoutModal.value = false
  layoutModalRecord.value = null
}

// 布局选择模态框的禁用原因（如旧数据有小键盘记录则 87 不可选）
const layoutDisabledReasons = computed(() => {
  if (!layoutModalRecord.value) return {}
  return getDisabledLayoutReasons(layoutModalRecord.value.keys)
})

// 顶栏布局按钮文案
const layoutButtonLabel = computed(() => {
  const record = currentRecord.value
  if (!record) return ''
  if (!isLayoutValid(record.layout)) return '选择布局'
  return layoutOptions.find(o => o.type === record.layout)?.name || `${record.layout} 键`
})

// 顶栏布局按钮：打开当前记录的布局选择
const handleOpenLayoutModal = () => {
  if (currentRecord.value) openSelectLayoutModal(currentRecord.value)
}

// 合并当前记录和待保存的更改（编辑模式预览），并按当前布局过滤掉布局外的键位
const displayKeys = computed(() => {
  if (!currentRecord.value) return {}
  const base = isEditMode.value
    ? { ...currentRecord.value.keys, ...pendingChanges }
    : currentRecord.value.keys
  const layoutCodes = new Set(getLayoutKeyCodes(getKeyboardLayout(currentLayout.value)))
  const filtered: Record<string, KeyHealth> = {}
  for (const [code, health] of Object.entries(base)) {
    if (layoutCodes.has(code)) filtered[code] = health
  }
  return filtered
})

// 创建新记录
const handleCreateRecord = (name: string, layout: KeyboardLayoutType) => {
  const newRecord: KeyboardHealthRecord = {
    id: Date.now().toString(),
    name,
    layout,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keys: {}
  }
  window.api.createRecord(newRecord)
  records.value.push(newRecord)
  currentRecordId.value = newRecord.id
  showCreateModal.value = false
  saveAppConfig()
}

// 选择记录
const selectRecord = (id: string) => {
  currentRecordId.value = id
  isDropdownOpen.value = false
  saveAppConfig()
  // 旧数据（无布局）提示手动选择布局
  checkLayoutForRecord(id)
}

// 打开删除确认模态框（传入要删除的记录）
const requestDeleteRecord = (record: KeyboardHealthRecord) => {
  recordToDelete.value = record
  showDeleteModal.value = true
}

// 确认删除记录
const handleDeleteRecord = async () => {
  const record = recordToDelete.value
  if (!record) return
  showDeleteModal.value = false
  recordToDelete.value = null

  try {
    await window.api.deleteRecord(record.id)
  } catch (err) {
    console.error('[删除失败]', err)
    return
  }

  // 从列表中移除
  const index = records.value.findIndex(r => r.id === record.id)
  if (index !== -1) records.value.splice(index, 1)

  // 若删除的是当前选中的记录，自动切换到剩余的第一条（无剩余则显示空状态）
  if (currentRecordId.value === record.id) {
    currentRecordId.value = records.value[0]?.id || ''
    saveAppConfig()
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (isEditMode.value && hasChanges.value) {
    showConfirmModal.value = true
  } else {
    isEditMode.value = !isEditMode.value
    if (isEditMode.value) {
      showRanking.value = false  // 编辑模式自动关闭排行
    }
    if (!isEditMode.value) {
      Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
      changeLog.value = []
      hasChanges.value = false
    }
  }
}

// 测试模式：物理按键的显示与计数统一走主进程转发通道（before-input-event + PrintScreen 全局快捷键）。
// 该通道在原生层触发、发生在渲染进程 IME 之前，code 来自硬件扫描码：
// - 可避免中文输入法等在 DOM 层吞掉 Shift 等修饰键（右 Shift 也能被检测到）；
// - 右 Shift / Num Enter / PrintScreen 天然准确，无需 location 归一化。
// DOM 层只保留一个 preventDefault 监听，用于阻止空格/方向键滚动页面。

const normalizeTestCode = (event: KeyboardEvent): string => {
  let code = event.code
  if (event.location === 2) {
    if (code === 'ShiftLeft') code = 'ShiftRight'
    else if (code === 'ControlLeft') code = 'ControlRight'
    else if (code === 'AltLeft') code = 'AltRight'
    else if (code === 'MetaLeft') code = 'MetaRight'
  }
  if (code === 'Enter' && event.location === 3) {
    code = 'NumpadEnter'
  }
  return code
}

// 仅阻止页面默认行为（空格/方向键滚动等），避免测试时页面滚动；显示交给主进程转发通道
const handleTestKeyPreventDefault = (event: KeyboardEvent) => {
  const code = normalizeTestCode(event)
  if (!layoutKeyCodes.value.has(code)) return
  event.preventDefault()
}

// 窗口失焦时清空按住状态（防止 keyup 丢失导致高亮卡住）
const clearTestPressed = () => {
  Object.keys(testPressed).forEach(code => delete testPressed[code])
}

// 来自主进程转发的原始按键事件
let unsubscribeTestKeys: (() => void) | null = null

const handleRawTestKey = (data: { type: 'keydown' | 'keyup'; code: string; repeat?: boolean }) => {
  if (!isTestMode.value) return
  const code = data.code
  if (!layoutKeyCodes.value.has(code)) return
  if (data.type === 'keydown') {
    // 忽略长按自动重复，只计有效按压
    if (!data.repeat) testPressCounts[code] = (testPressCounts[code] || 0) + 1
    testPressed[code] = true
  } else {
    delete testPressed[code]
  }
}

// 切换测试模式：开启时通知主进程转发按键，退出时卸载并清空本次测试数据
const toggleTestMode = () => {
  isTestMode.value = !isTestMode.value
  if (isTestMode.value) {
    showRanking.value = false  // 测试模式自动关闭排行
    window.api.setTestMode?.(true)
    unsubscribeTestKeys = window.api.onTestKeyEvent?.(handleRawTestKey) ?? null
    window.addEventListener('keydown', handleTestKeyPreventDefault)
    window.addEventListener('blur', clearTestPressed)
  } else {
    window.api.setTestMode?.(false)
    unsubscribeTestKeys?.()
    unsubscribeTestKeys = null
    window.removeEventListener('keydown', handleTestKeyPreventDefault)
    window.removeEventListener('blur', clearTestPressed)
    // 退出后清空本次测试的按下次数与按住状态（不做本地保存）
    Object.keys(testPressCounts).forEach(code => delete testPressCounts[code])
    Object.keys(testPressed).forEach(code => delete testPressed[code])
  }
}

// 清空测试计数（不退出测试模式）
const resetTestCounts = () => {
  Object.keys(testPressCounts).forEach(code => delete testPressCounts[code])
  Object.keys(testPressed).forEach(code => delete testPressed[code])
}

// 处理按键点击（编辑模式）
const handleKeyClick = (keyCode: string) => {
  if (!isEditMode.value) return

  const currentKeyHealth = pendingChanges[keyCode] || currentRecord.value?.keys[keyCode]
  const currentStatus = currentKeyHealth?.status || KeyStatus.HEALTHY
  const now = new Date().toISOString()

  let newStatus: KeyStatus
  let newHealth: KeyHealth
  let changeType: ChangeType

  if (currentStatus === KeyStatus.HEALTHY) {
    // 健康 → 损坏：新增一条损坏事件到历史
    newStatus = KeyStatus.DAMAGED
    changeType = 'damaged'
    newHealth = {
      keyCode,
      status: newStatus,
      history: [{ damagedAt: now, damageType: EventType.NORMAL }]
    }
  } else if (currentStatus === KeyStatus.DAMAGED) {
    // 损坏 → 已更换：更新最后一条未更换的事件
    newStatus = KeyStatus.REPLACED
    changeType = 'replaced'
    const history = [...(currentKeyHealth?.history || [])]
    // 找到最后一个没有 replacedAt 的事件，设置更换时间
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].replacedAt) {
        history[i] = { ...history[i], replacedAt: now, replacementType: EventType.NORMAL }
        break
      }
    }
    newHealth = {
      keyCode,
      status: newStatus,
      history
    }
  } else {
    // REPLACED → DAMAGED（二次损坏）：追加新的损坏事件，保留历史
    newStatus = KeyStatus.DAMAGED
    changeType = 'redamaged'
    const history = [...(currentKeyHealth?.history || [])]
    history.push({ damagedAt: now, damageType: EventType.NORMAL })
    newHealth = {
      keyCode,
      status: newStatus,
      history
    }
  }

  pendingChanges[keyCode] = newHealth
  changeLog.value.push({ keyCode, type: changeType })
  hasChanges.value = true
}

/**
 * 换轴按“键位维修”记录，而不是交换两颗实体轴的履历：
 * - 来源键位保留自己的历史，并新增一次损坏：原目标的损坏轴被装到了这里；
 * - 目标损坏键位保留自己的所有历史，并将最后一次未更换损坏标记为已更换。
 * 这样每个键位的损坏次数和更换次数始终属于该键位，不会因换轴而调换或合并。
 */
const handleSwitchMove = (sourceKeyCode: string, targetKeyCode: string) => {
  if (!isEditMode.value || sourceKeyCode === targetKeyCode) return

  const source = pendingChanges[sourceKeyCode] || currentRecord.value?.keys[sourceKeyCode]
  const target = pendingChanges[targetKeyCode] || currentRecord.value?.keys[targetKeyCode]
  const sourceStatus = source?.status || KeyStatus.HEALTHY

  if ((sourceStatus !== KeyStatus.HEALTHY && sourceStatus !== KeyStatus.REPLACED) || target?.status !== KeyStatus.DAMAGED) {
    return
  }

  const replacedAt = new Date().toISOString()
  const targetHistory = target.history.map(event => ({ ...event }))
  // 损坏状态一定至少有一条未完成的损坏事件；倒序处理以确保补全最近一次。
  for (let index = targetHistory.length - 1; index >= 0; index--) {
    if (!targetHistory[index].replacedAt) {
      targetHistory[index] = {
        ...targetHistory[index],
        replacedAt,
        replacementType: EventType.SWAP,
        swapWithKeyCode: sourceKeyCode
      }
      break
    }
  }

  // 损坏轴被装到来源键位：保留来源键位既有履历，再追加本次损坏。
  const sourceHistory = source?.history.map(event => ({ ...event })) || []
  sourceHistory.push({
    damagedAt: replacedAt,
    damageType: EventType.SWAP,
    swapWithKeyCode: targetKeyCode
  })
  pendingChanges[sourceKeyCode] = {
    keyCode: sourceKeyCode,
    status: KeyStatus.DAMAGED,
    history: sourceHistory
  }
  pendingChanges[targetKeyCode] = {
    keyCode: targetKeyCode,
    status: KeyStatus.REPLACED,
    history: targetHistory
  }
  // 换轴涉及两个键位：来源键损坏/再次损坏，目标键更换
  changeLog.value.push(
    { keyCode: sourceKeyCode, type: sourceStatus === KeyStatus.HEALTHY ? 'damaged' : 'redamaged' },
    { keyCode: targetKeyCode, type: 'replaced' }
  )
  hasChanges.value = true
}

// 保存更改
const saveChanges = async () => {
  if (!currentRecord.value) {
    showConfirmModal.value = false
    return
  }

  try {
    // 1. 将待保存的更改应用到当前记录
    Object.entries(pendingChanges).forEach(([keyCode, health]) => {
      if (health.status === KeyStatus.HEALTHY) {
        delete currentRecord.value!.keys[keyCode]
      } else {
        currentRecord.value!.keys[keyCode] = health
      }
    })
    currentRecord.value.updatedAt = new Date().toISOString()

    // 2. 深拷贝确保 IPC 序列化安全（去掉 Vue 响应式代理）
    const payload = JSON.parse(JSON.stringify(currentRecord.value))
    await window.api.updateRecord(payload)

    console.log('[保存成功]')
  } catch (err) {
    console.error('[保存失败]', err)
    // 保存失败时保持编辑模式，让用户可以重试
    showConfirmModal.value = false
    return
  }

  // 3. 保存成功后清理状态
  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
  changeLog.value = []
  hasChanges.value = false
  isEditMode.value = false
  showConfirmModal.value = false
}

// 放弃更改
const discardChanges = () => {
  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
  changeLog.value = []
  hasChanges.value = false
  isEditMode.value = false
  showConfirmModal.value = false
}

// 获取更改摘要（按操作日志逐条汇总，保留同键多次操作的每一次记录）
const changesSummary = computed(() => {
  const changes: Record<ChangeType, string[]> = {
    damaged: [],
    redamaged: [],
    replaced: [],
    healed: []
  }

  changeLog.value.forEach(op => {
    changes[op.type].push(op.keyCode)
  })

  return changes
})

// 统计信息
const stats = computed(() => {
  const keys = displayKeys.value
  let damaged = 0
  let replaced = 0
  Object.values(keys).forEach(k => {
    if (k.status === KeyStatus.DAMAGED) damaged++
    if (k.status === KeyStatus.REPLACED) replaced++
  })
  const total = getLayoutKeyCodes(getKeyboardLayout(currentLayout.value)).length
  return { damaged, replaced, total }
})

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-wrapper')) {
    isDropdownOpen.value = false
  }
}

// 初始化用户数据
const initUserData = async () => {
  const userData = await window.api.getUserData()
  for (const record of userData) {
    records.value.push(record)
  }

  if (records.value.length > 0) {
    // 读取配置，优先恢复上次退出时选中的记录；不存在或已删除时回退到第一条
    let lastRecordId = ''
    try {
      const config = await window.api.getConfig()
      lastRecordId = config?.lastRecordId || ''
    } catch (err) {
      console.warn('[配置] 读取配置失败', err)
    }

    const target = lastRecordId && records.value.some(r => r.id === lastRecordId)
      ? lastRecordId
      : records.value[0].id
    currentRecordId.value = target
    // 旧数据（无布局）提示手动选择布局
    checkLayoutForRecord(target)
  }
}

// 组件卸载时兜底清理测试模式监听
onUnmounted(() => {
  window.api.setTestMode?.(false)
  if (isTestMode.value) {
    window.removeEventListener('keydown', handleTestKeyPreventDefault)
    window.removeEventListener('blur', clearTestPressed)
  }
  unsubscribeTestKeys?.()
  unsubscribeTestKeys = null
})
</script>

<template>
  <div class="app-container">
    <!-- 顶部工具栏 -->
    <header class="app-header">
      <div class="header-content">
        <!-- 左侧：Logo + 下拉选择框 -->
        <div class="header-left">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="6" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="10" y1="10" x2="10" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="14" y1="10" x2="14" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="18" y1="10" x2="18" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="6" y1="14" x2="18" y2="14" stroke-linecap="round" />
            </svg>
            <span class="logo-text">KeyHealth</span>
          </div>

          <div class="divider"></div>

          <!-- 自定义下拉框 -->
          <div class="dropdown-wrapper">
            <label class="dropdown-label">当前键盘</label>
            <div class="dropdown-container">
              <button class="dropdown-trigger" :class="{ 'dropdown-open': isDropdownOpen }"
                :disabled="isEditMode || isTestMode" @click.stop="isDropdownOpen = !isDropdownOpen">
                <span class="dropdown-value">{{ currentRecord?.name || '选择键盘' }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <Transition name="dropdown">
                <div v-if="isDropdownOpen && !isEditMode" class="dropdown-menu">
                  <div v-for="record in records" :key="record.id" class="dropdown-item"
                    :class="{ 'dropdown-item-active': record.id === currentRecordId }">
                    <button class="dropdown-item-select" @click="selectRecord(record.id)">
                      <span class="dropdown-item-name">{{ record.name }}</span>
                      <svg v-if="record.id === currentRecordId" class="dropdown-item-check" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    <button class="dropdown-item-delete" title="删除记录" @click.stop="requestDeleteRecord(record)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 键盘布局 -->
          <button v-if="currentRecord" class="layout-tag"
            :class="{ 'layout-tag-pending': !isLayoutValid(currentRecord.layout) }"
            :disabled="isEditMode || isTestMode"
            :title="isLayoutValid(currentRecord.layout) ? '更换键盘布局' : '请为此键盘选择布局'" @click="handleOpenLayoutModal">
            <svg class="layout-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="6" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="10" y1="10" x2="10" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="14" y1="10" x2="14" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="18" y1="10" x2="18" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="6" y1="14" x2="18" y2="14" stroke-linecap="round" />
            </svg>
            <span>{{ layoutButtonLabel }}</span>
          </button>
        </div>

        <!-- 右侧：主题切换 + 操作按钮 -->
        <div class="header-right">
          <!-- 排行切换 -->
          <button class="theme-toggle" :class="{ 'toggle-active': showRanking }"
            :title="showRanking ? '返回键盘视图' : '查看损坏排行'" :disabled="isEditMode || isTestMode"
            @click="showRanking = !showRanking">
            <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          <!-- 主题切换 -->
          <button class="theme-toggle" @click="isDark = !isDark" :title="isDark ? '切换到亮色模式' : '切换到暗色模式'">
            <svg v-if="isDark" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <div class="divider"></div>

          <!-- 测试按钮 -->
          <button @click="toggleTestMode" :disabled="!currentRecord || isEditMode"
            :class="['btn', isTestMode ? 'btn-test-active' : 'btn-secondary']">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            {{ isTestMode ? '退出测试' : '测试模式' }}
          </button>

          <!-- 编辑按钮 -->
          <button @click="toggleEditMode" :disabled="isTestMode"
            :class="['btn', isEditMode ? 'btn-active' : 'btn-secondary']">
            <svg v-if="!isEditMode" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            {{ isEditMode ? '完成编辑' : '编辑模式' }}
          </button>

          <!-- 创建按钮 -->
          <button @click="showCreateModal = true" :disabled="isEditMode || isTestMode" class="btn btn-primary">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建记录
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <!-- 编辑模式提示 -->
      <Transition name="slide">
        <div v-if="isEditMode" class="edit-banner">
          <div class="edit-banner-content">
            <div class="edit-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div class="edit-banner-text">
              <span class="edit-banner-title">编辑模式已开启</span>
              <span class="edit-banner-desc">点击按键循环切换状态；长按健康或已更换轴拖到损坏轴，会记录目标更换与来源损坏</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 测试模式提示 -->
      <Transition name="slide">
        <div v-if="isTestMode" class="test-banner">
          <div class="test-banner-content">
            <div class="test-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div class="test-banner-text">
              <span class="test-banner-title">测试模式已开启</span>
              <span class="test-banner-desc">按下实体键盘按键即可在面板上高亮显示并记录次数；退出后自动清空，不会保存</span>
              <span class="test-hint-trigger" tabindex="0">
                <svg class="test-hint-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>按键无反应？</span>
                <div class="test-hint-tooltip" role="tooltip">
                  若个别按键（如右侧 Shift）按下无反应，多为中文输入法拦截了该键（中/英切换），
                  请切换英文输入法或在输入法设置中取消绑定 Shift。
                </div>
              </span>
            </div>
            <div class="test-banner-controls">
              <div class="test-total">
                <span class="test-total-value">{{ testTotalCount }}</span>
                <span class="test-total-label">总按下次数</span>
              </div>
              <label class="test-switch" title="隐藏已记录的损坏/更换状态颜色，让按下反馈更清晰">
                <input v-model="testHideStatus" type="checkbox" />
                <span class="test-switch-track">
                  <span class="test-switch-thumb"></span>
                </span>
                <span class="test-switch-label">隐藏状态颜色</span>
              </label>
              <button class="test-reset-btn" title="清空本次测试的按下次数" @click="resetTestCounts">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                清空计数
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 无键盘提示 -->
      <div v-if="!currentRecord" class="empty-state">
        <div class="empty-state-content">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="6" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="10" y1="10" x2="10" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="14" y1="10" x2="14" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="18" y1="10" x2="18" y2="10.01" stroke-width="2" stroke-linecap="round" />
              <line x1="6" y1="14" x2="18" y2="14" stroke-linecap="round" />
            </svg>
          </div>
          <h2 class="empty-state-title">暂无键盘记录</h2>
          <p class="empty-state-description">开始使用 KeyHealth 来追踪您的键盘健康状况</p>
          <button @click="showCreateModal = true" class="btn btn-primary btn-lg">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            创建第一个键盘记录
          </button>
        </div>
      </div>

      <!-- 有键盘时的内容 -->
      <template v-else>
        <!-- 状态统计和图例（测试模式下隐藏，改用测试横幅） -->
        <div v-if="!showRanking && !isTestMode" class="info-bar">
          <div class="legend">
            <div class="legend-item">
              <div class="legend-dot healthy"></div>
              <span>健康</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot damaged"></div>
              <span>损坏</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot replaced"></div>
              <span>已更换</span>
            </div>
          </div>

          <div class="stats">
            <div class="stat-item">
              <span class="stat-value">{{ stats.total - stats.damaged - stats.replaced }}</span>
              <span class="stat-label">健康</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item damaged">
              <span class="stat-value">{{ stats.damaged }}</span>
              <span class="stat-label">损坏</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item replaced">
              <span class="stat-value">{{ stats.replaced }}</span>
              <span class="stat-label">已更换</span>
            </div>
          </div>
        </div>

        <!-- 键盘视图 / 排行视图 -->
        <KeyboardView v-if="!showRanking" :keys="displayKeys" :is-edit-mode="isEditMode"
          :layout="getKeyboardLayout(currentLayout)" :test-mode="isTestMode" :test-pressed="testPressed"
          :test-press-counts="testPressCounts" :test-hide-status="testHideStatus" @key-click="handleKeyClick"
          @switch-move="handleSwitchMove" />

        <!-- 损坏排行柱状图 -->
        <div v-else class="ranking-view">
          <div class="ranking-header">
            <h3 class="ranking-title">按键损坏排行</h3>
            <span class="ranking-subtitle">按累计损坏次数降序排列</span>
          </div>

          <div v-if="rankingData.length === 0" class="ranking-empty">
            <svg class="ranking-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无损坏记录</p>
          </div>

          <div v-else class="ranking-list">
            <div v-for="(item, idx) in rankingData" :key="item.keyCode" class="ranking-row">
              <span class="ranking-index" :class="{ 'top-three': idx < 3 }">{{ idx + 1 }}</span>
              <span class="ranking-key-label" :title="item.label">{{ item.label }}</span>
              <div class="ranking-bar-track">
                <div class="ranking-bar-fill" :class="item.status === 'replaced' ? 'bar-replaced' : 'bar-damaged'"
                  :style="{ width: (item.count / maxRankCount * 100) + '%' }">
                  <span class="ranking-bar-count">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 当前记录信息 -->
      <div v-if="currentRecord" class="record-info">
        <div class="record-info-item">
          <span class="record-info-label">创建时间</span>
          <span class="record-info-value">{{ new Date(currentRecord.createdAt).toLocaleString('zh-CN') }}</span>
        </div>
        <div class="record-info-item">
          <span class="record-info-label">最后更新</span>
          <span class="record-info-value">{{ new Date(currentRecord.updatedAt).toLocaleString('zh-CN') }}</span>
        </div>
      </div>
    </main>

    <!-- 创建记录模态框 -->
    <CreateRecordModal v-if="showCreateModal" @close="showCreateModal = false" @create="handleCreateRecord" />

    <!-- 选择布局模态框（旧数据适配 / 更换布局） -->
    <SelectLayoutModal v-if="showSelectLayoutModal" :record-name="layoutModalRecord?.name || ''"
      :current-layout="layoutModalPreselect" :disabled-reasons="layoutDisabledReasons" @select="handleSelectLayout"
      @cancel="showSelectLayoutModal = false" />

    <!-- 确认保存模态框 -->
    <ConfirmModal v-if="showConfirmModal" title="保存更改" :changes="changesSummary" @save="saveChanges"
      @discard="discardChanges" @cancel="showConfirmModal = false" />

    <!-- 删除记录确认模态框 -->
    <DeleteRecordModal v-if="showDeleteModal && recordToDelete" :record-name="recordToDelete.name"
      @confirm="handleDeleteRecord" @cancel="showDeleteModal = false" />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  transition: background-color 0.3s ease;
}

/* Header */
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* Custom Dropdown */
.dropdown-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.dropdown-label {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 180px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-trigger:hover:not(:disabled) {
  border-color: var(--color-border-light);
  background: var(--color-surface-hover);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-trigger.dropdown-open {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.dropdown-value {
  flex: 1;
  text-align: left;
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
}

.dropdown-trigger.dropdown-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.dark .dropdown-menu {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.dropdown-item {
  display: flex;
  align-items: center;
  border-radius: 6px;
  transition: all 0.1s ease;
}

.dropdown-item:hover {
  background: var(--color-surface-hover);
}

.dropdown-item-active {
  background: var(--color-accent-light);
}

.dropdown-item-active:hover {
  background: var(--color-accent-light);
}

/* 记录选中部分（点击切换记录） */
.dropdown-item-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
  padding: 10px 0 10px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: inherit;
  cursor: pointer;
  min-width: 0;
}

.dropdown-item-name {
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item-active .dropdown-item-name {
  color: var(--color-accent);
}

.dropdown-item-check {
  width: 16px;
  height: 16px;
  color: var(--color-accent);
  flex-shrink: 0;
}

/* 记录删除按钮（悬停时显示） */
.dropdown-item-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 4px 6px 4px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.dropdown-item:hover .dropdown-item-delete,
.dropdown-item-delete:focus-visible {
  opacity: 1;
}

.dropdown-item-delete:hover {
  background: var(--color-damaged-light);
  color: var(--color-damaged);
}

.dropdown-item-delete svg {
  width: 15px;
  height: 15px;
}

/* 键盘布局标签按钮 */
.layout-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.layout-tag:hover:not(:disabled) {
  border-color: var(--color-border-light);
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.layout-tag:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layout-tag-icon {
  width: 15px;
  height: 15px;
}

/* 旧数据未选布局时的强调态 */
.layout-tag-pending {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.layout-tag-pending:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Dropdown Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Theme Toggle */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-toggle:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-light);
}

.theme-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-secondary {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-light);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-active {
  background: var(--color-accent);
  color: white;
}

.btn-active:hover {
  background: var(--color-accent-hover);
}

.btn-test-active {
  background: var(--color-test);
  color: #fff;
}

.btn-test-active:hover {
  background: var(--color-test-hover);
}

/* Main */
.app-main {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Edit Banner */
.edit-banner {
  width: 100%;
  max-width: 960px;
  background: var(--color-accent-light);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 12px;
  padding: 14px 18px;
}

.edit-banner-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.edit-banner-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-banner-icon svg {
  width: 20px;
  height: 20px;
  color: white;
}

.edit-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.edit-banner-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

.edit-banner-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Test Banner（测试模式） */
.test-banner {
  width: 100%;
  max-width: 960px;
  background: var(--color-test-light);
  border: 1px solid var(--color-test-border);
  border-radius: 12px;
  padding: 12px 18px;
}

.test-banner-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.test-banner-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-test);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.test-banner-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.test-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.test-banner-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.test-banner-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 中文输入法拦截按键：悬停说明按钮 + 工具提示 */
.test-hint-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-accent);
  background: var(--color-accent-light);
  cursor: help;
  user-select: none;
  transition: all 0.15s ease;
}

.test-hint-trigger:hover {
  color: var(--color-accent-hover);
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
}

/* 悬停桥：连接触发区与工具提示，避免鼠标移到提示时误触发隐藏 */
.test-hint-trigger::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 8px;
}

.test-hint-trigger-icon {
  width: 14px;
  height: 14px;
}

.test-hint-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 120;
  width: 340px;
  max-width: 70vw;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}

.dark .test-hint-tooltip {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.test-hint-trigger:hover .test-hint-tooltip,
.test-hint-trigger:focus .test-hint-tooltip,
.test-hint-trigger:focus-within .test-hint-tooltip {
  display: block;
}

.test-banner-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

/* 总按下次数 */
.test-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.test-total-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-test);
  font-variant-numeric: tabular-nums;
}

.test-total-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* 隐藏状态颜色开关 */
.test-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.test-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.test-switch-track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-border-light);
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.test-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.test-switch input:checked + .test-switch-track {
  background: var(--color-test);
}

.test-switch input:checked + .test-switch-track .test-switch-thumb {
  transform: translateX(16px);
}

.test-switch-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* 清空计数按钮 */
.test-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.test-reset-btn:hover {
  border-color: var(--color-border-light);
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.test-reset-btn svg {
  width: 14px;
  height: 14px;
}

/* Info Bar */
.info-bar {
  width: 100%;
  max-width: 960px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.legend {
  display: flex;
  align-items: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.legend-dot.healthy {
  background: var(--key-bg);
  border: 1px solid var(--color-border);
}

.legend-dot.damaged {
  background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
}

.legend-dot.replaced {
  background: linear-gradient(180deg, #d97706 0%, #92400e 100%);
}

.stats {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 16px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-item.damaged .stat-value {
  color: var(--color-damaged);
}

.stat-item.replaced .stat-value {
  color: var(--color-replaced);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* Record Info */
.record-info {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 8px;
}

.record-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-info-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.record-info-value {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.empty-state-content {
  text-align: center;
  max-width: 400px;
}

.empty-state-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-state-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.empty-state-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}

/* 排行按钮激活态 */
.toggle-active {
  background: var(--color-accent-light) !important;
  border-color: var(--color-accent) !important;
}

.toggle-active .theme-icon {
  color: var(--color-accent);
}

/* ========== 排行视图 ========== */
.ranking-view {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ranking-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.ranking-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.ranking-subtitle {
  font-size: 12px;
  color: var(--color-text-muted);
}

.ranking-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.ranking-empty-icon {
  width: 40px;
  height: 40px;
  opacity: 0.5;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ranking-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
}

.ranking-index {
  width: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.ranking-index.top-three {
  color: var(--color-accent);
}

.ranking-key-label {
  width: 80px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
  flex-shrink: 0;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-bar-track {
  flex: 1;
  height: 22px;
  background: var(--color-background);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.ranking-bar-fill {
  height: 100%;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 32px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.bar-damaged {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
}

.bar-replaced {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.ranking-bar-count {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  padding-right: 6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
