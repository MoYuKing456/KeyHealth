<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, watch, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { EventType, KeyStatus, type DamageEvent, type KeyDefinition, type KeyHealth } from '../types'

const props = defineProps<{
  keyDef: KeyDefinition
  keyHealth?: KeyHealth
  isEditMode: boolean
  isTall?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

// 测试模式状态（由 KeyboardView provide 注入）
interface TestState {
  testMode: boolean
  pressedKeys: Record<string, boolean>
  pressCounts: Record<string, number>
  hideStatus: boolean
}
const testState = inject<ComputedRef<TestState> | null>('testState', null)
const isTestMode = computed(() => testState?.value.testMode || false)
// 当前键是否被物理按下（测试模式高亮）
const isPressed = computed(() => isTestMode.value && !!testState?.value.pressedKeys[props.keyDef.code])
// 本次测试中该键的按下次数
const pressCount = computed(() => (isTestMode.value ? testState?.value.pressCounts[props.keyDef.code] || 0 : 0))

// 改键状态（由 KeyboardView provide）：该物理键位被改成发送其它功能时显示功能名与标识
interface RemapState {
  remap: Record<string, string>
  functionLabels: Record<string, string>
}
const remapState = inject<ComputedRef<RemapState> | null>('remapState', null)
const remapInfo = computed(() => {
  const to = remapState?.value.remap[props.keyDef.code]
  if (!to) return null
  return {
    to,
    toLabel: remapState?.value.functionLabels[to] || to
  }
})

const showTooltip = ref(false)
const isPinned = ref(false)
const historyListRef = ref<HTMLElement | null>(null)
const keyWrapperRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

// 工具提示距视口边缘的最小间距
const TOOLTIP_MARGIN = 8

const keyWidth = computed(() => {
  const baseWidth = 44
  const gap = 4
  const width = props.keyDef.width || 1
  return `${width * baseWidth + (width - 1) * gap}px`
})

const keyHeight = computed(() => {
  if (props.isTall) {
    const baseHeight = 44
    const gap = 4
    return `${2 * baseHeight + gap}px`
  }
  return '44px'
})

const status = computed(() => props.keyHealth?.status || KeyStatus.HEALTHY)

const damageCount = computed(() => props.keyHealth?.history?.length || 0)

const statusClass = computed(() => {
  switch (status.value) {
    case KeyStatus.DAMAGED:
      return 'key-damaged'
    case KeyStatus.REPLACED:
      return 'key-replaced'
    default:
      return 'key-healthy'
  }
})

// 工具提示是否可见（测试模式下不显示，避免干扰按键反馈）
const tooltipVisible = computed(() => {
  if (!props.keyHealth || props.keyHealth.status === KeyStatus.HEALTHY) return false
  if (isTestMode.value) return false
  return showTooltip.value || isPinned.value
})

// 滚动历史记录列表到底部（最新记录）
const scrollHistoryToBottom = async () => {
  await nextTick()
  if (historyListRef.value) {
    historyListRef.value.scrollTop = historyListRef.value.scrollHeight
  }
}

// 工具提示定位：默认显示在键上方并水平居中；靠近视口左右边缘时水平夹紧，
// 上方空间不足时翻转到键下方，保证信息框始终完整可见，箭头仍指向该键。
const positionTooltip = async () => {
  await nextTick()
  const wrapper = keyWrapperRef.value
  const tooltip = tooltipRef.value
  if (!wrapper || !tooltip) return

  const wrapRect = wrapper.getBoundingClientRect()
  const tipRect = tooltip.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = TOOLTIP_MARGIN
  const gap = 10
  const keyCenter = wrapRect.left + wrapRect.width / 2

  // 垂直：上方空间不足且下方足够时翻转到键下方
  const spaceAbove = wrapRect.top - margin
  const spaceBelow = vh - wrapRect.bottom - margin
  const showBelow = tipRect.height + gap > spaceAbove && tipRect.height + gap <= spaceBelow
  tooltip.classList.toggle('key-tooltip-below', showBelow)

  // 水平：以键中心为锚点，把工具提示夹紧在视口内
  const desiredLeft = keyCenter - tipRect.width / 2
  const clampedLeft = Math.min(
    Math.max(desiredLeft, margin),
    Math.max(margin, vw - tipRect.width - margin)
  )
  const shift = clampedLeft - keyCenter
  tooltip.style.setProperty('--tip-x', `${shift}px`)

  // 箭头保持指向键中心（相对工具提示左边缘）
  if (arrowRef.value) {
    arrowRef.value.style.left = `${keyCenter - clampedLeft}px`
  }
}

// 工具提示可见时重新定位；隐藏时无需处理（v-if 会销毁元素）
watch(tooltipVisible, (visible) => {
  if (visible) positionTooltip()
})

// 窗口尺寸变化时重新定位可见的工具提示
const handleWindowResize = () => {
  if (tooltipVisible.value) positionTooltip()
}

// 编辑模式下状态切换会让 v-if/v-else-if 重建历史列表 DOM、滚动位置重置到顶部。
// 这里在键位数据变化后自动滚动到底部，保证窗口始终展示最新记录。
watch(
  () => props.keyHealth,
  () => {
    if (tooltipVisible.value) {
      scrollHistoryToBottom()
    }
  },
  { deep: true }
)

// 按键点击处理
const handleClick = (event: MouseEvent) => {
  // 测试模式下屏蔽点击行为（固定/切换记录窗口等），只响应物理键盘
  if (isTestMode.value) return

  const button = event.currentTarget as HTMLButtonElement
  // 仅忽略本次长按拖动所产生的 click；标记挂在具体按钮上，不会影响下一次普通点击。
  if (button.dataset.ignoreNextClick === 'true') {
    delete button.dataset.ignoreNextClick
    return
  }

  // 长按拖动换轴结束时，由 KeyboardView 阻止这次合成 click，避免误触发状态循环。
  if (event.defaultPrevented) return

  if (props.isEditMode) {
    // 编辑模式：切换按键状态
    emit('click')
  } else if (damageCount.value > 0) {
    // 非编辑模式：固定/取消固定记录窗口
    isPinned.value = !isPinned.value
    if (isPinned.value) {
      showTooltip.value = true
      scrollHistoryToBottom()
    }
  }
}

// 鼠标移入
const handleMouseEnter = () => {
  showTooltip.value = true
  if (damageCount.value > 0 && !isPinned.value) {
    scrollHistoryToBottom()
  }
}

// 鼠标移出
const handleMouseLeave = () => {
  if (!isPinned.value) {
    showTooltip.value = false
  }
}

// 点击工具提示外部关闭固定
const handleOutsideClick = (e: MouseEvent) => {
  if (!isPinned.value) return
  if (keyWrapperRef.value && !keyWrapperRef.value.contains(e.target as Node)) {
    isPinned.value = false
    showTooltip.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick, true)
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick, true)
  window.removeEventListener('resize', handleWindowResize)
})

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getDamageLabel = (event: DamageEvent) => event.damageType === EventType.SWAP ? '调换损坏时间' : '普通损坏时间'
const getReplacementLabel = (event: DamageEvent) => event.replacementType === EventType.SWAP ? '调换完成时间' : '普通更换时间'
const isSwapEvent = (event: DamageEvent) => event.damageType === EventType.SWAP || event.replacementType === EventType.SWAP
const formatKeyCode = (keyCode?: string) => {
  if (!keyCode) return '旧数据未记录'
  if (/^Key[A-Z]$/.test(keyCode)) return keyCode.slice(3)
  if (/^Digit\d$/.test(keyCode)) return keyCode.slice(5)
  if (/^Numpad\d$/.test(keyCode)) return `小键盘 ${keyCode.slice(6)}`
  const labels: Record<string, string> = {
    Space: '空格', Enter: 'Enter', Backspace: 'Backspace', Tab: 'Tab', Escape: 'Esc',
    ShiftLeft: '左 Shift', ShiftRight: '右 Shift', ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl',
    AltLeft: '左 Alt', AltRight: '右 Alt', MetaLeft: '左 Win', MetaRight: '右 Win'
  }
  return labels[keyCode] || keyCode
}
</script>

<template>
  <div ref="keyWrapperRef" class="key-wrapper">
    <button @click="handleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"
      :style="{ width: keyWidth, height: keyHeight }" :data-key-code="keyDef.code" :class="[
        'key-button',
        statusClass,
        { 'key-editable': isEditMode, 'key-test-pressed': isPressed }
      ]">
      <span v-if="damageCount > 0" class="damage-count-badge">{{ damageCount }}</span>
      <span v-if="isTestMode && pressCount > 0" class="test-count-badge">{{ pressCount }}</span>
      <span v-if="remapInfo" class="remap-badge" :title="`已由 ${keyDef.label || keyDef.code} 改为 ${remapInfo.toLabel}`">改</span>
      <span class="key-label" :class="{ 'key-label-remapped': remapInfo }">
        {{ remapInfo ? remapInfo.toLabel : keyDef.label }}
      </span>
    </button>

    <!-- Tooltip -->
    <Transition name="fade">
      <div v-if="tooltipVisible" ref="tooltipRef" class="key-tooltip" :class="{ 'key-tooltip-pinned': isPinned }">
        <div v-if="keyHealth!.status === KeyStatus.DAMAGED" class="tooltip-content">
          <div class="tooltip-header">
            <div class="tooltip-status damaged">
              <span class="status-dot"></span>
              损坏
              <span v-if="keyHealth!.history && keyHealth!.history.length > 1" class="tooltip-badge">第{{
                keyHealth!.history.length }}次</span>
            </div>
            <span v-if="isPinned" class="pin-indicator" title="已固定，点击外部关闭">📌</span>
          </div>
          <!-- 历史记录列表 -->
          <div v-if="keyHealth!.history && keyHealth!.history.length > 0" ref="historyListRef" class="tooltip-history">
            <div v-for="(event, idx) in keyHealth!.history" :key="idx" class="tooltip-event">
              <div class="tooltip-info">
                <span class="event-index">#{{ idx + 1 }}</span>
                <span class="tooltip-label">{{ getDamageLabel(event) }}</span>
                <span class="tooltip-value">{{ formatDate(event.damagedAt) }}</span>
              </div>
              <div v-if="event.replacedAt" class="tooltip-info replaced-info">
                <span class="event-marker" aria-hidden="true">↳</span>
                <span class="tooltip-label">{{ getReplacementLabel(event) }}</span>
                <span class="tooltip-value">{{ formatDate(event.replacedAt) }}</span>
              </div>
              <div v-if="isSwapEvent(event)" class="tooltip-info swap-info">
                <span class="event-marker" aria-hidden="true">↳</span>
                <span class="tooltip-label">调换按键</span>
                <span class="tooltip-value">{{ formatKeyCode(event.swapWithKeyCode) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="keyHealth!.status === KeyStatus.REPLACED" class="tooltip-content">
          <div class="tooltip-header">
            <div class="tooltip-status replaced">
              <span class="status-dot"></span>
              已更换
              <span v-if="keyHealth!.history && keyHealth!.history.length > 1" class="tooltip-badge">第{{
                keyHealth!.history.length }}次</span>
            </div>
            <span v-if="isPinned" class="pin-indicator" title="已固定，点击外部关闭">📌</span>
          </div>
          <!-- 历史记录列表 -->
          <div v-if="keyHealth!.history && keyHealth!.history.length > 0" ref="historyListRef" class="tooltip-history">
            <div v-for="(event, idx) in keyHealth!.history" :key="idx" class="tooltip-event">
              <div class="tooltip-info">
                <span class="event-index">#{{ idx + 1 }}</span>
                <span class="tooltip-label">{{ getDamageLabel(event) }}</span>
                <span class="tooltip-value">{{ formatDate(event.damagedAt) }}</span>
              </div>
              <div v-if="event.replacedAt" class="tooltip-info replaced-info">
                <span class="event-marker" aria-hidden="true">↳</span>
                <span class="tooltip-label">{{ getReplacementLabel(event) }}</span>
                <span class="tooltip-value">{{ formatDate(event.replacedAt) }}</span>
              </div>
              <div v-if="isSwapEvent(event)" class="tooltip-info swap-info">
                <span class="event-marker" aria-hidden="true">↳</span>
                <span class="tooltip-label">调换按键</span>
                <span class="tooltip-value">{{ formatKeyCode(event.swapWithKeyCode) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div ref="arrowRef" class="tooltip-arrow"></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.key-wrapper {
  position: relative;
  display: flex;
}

.key-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--key-radius);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: all 0.15s ease;
  cursor: default;
  position: relative;
  border: none;
  outline: none;
  flex-shrink: 0;
}

.key-label {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 2px;
}

/* 损坏次数徽标 */
.damage-count-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 13px;
  height: 13px;
  padding: 0 3px;
  border-radius: 7px;
  font-size: 8px;
  font-weight: 700;
  line-height: 13px;
  text-align: center;
  pointer-events: none;
  z-index: 2;
  background: rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0;
  transition: background 0.15s ease;
}

/* 健康状态 */
.key-healthy {
  background: var(--key-bg);
  color: var(--key-text);
  box-shadow: var(--key-shadow);
}

.key-healthy:hover {
  color: var(--key-text-hover);
}

/* 损坏状态 */
.key-damaged {
  background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
  color: #fef2f2;
  box-shadow:
    0 1px 0 0 rgba(255, 255, 255, 0.1),
    0 2px 0 0 #7f1d1d,
    0 3px 3px rgba(0, 0, 0, 0.25),
    0 0 16px rgba(239, 68, 68, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 已更换状态 */
.key-replaced {
  background: linear-gradient(180deg, #d97706 0%, #92400e 100%);
  color: #fefce8;
  box-shadow:
    0 1px 0 0 rgba(255, 255, 255, 0.1),
    0 2px 0 0 #78350f,
    0 3px 3px rgba(0, 0, 0, 0.25),
    0 0 16px rgba(245, 158, 11, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 测试模式：物理按键按下高亮（覆盖健康/损坏/更换底色，保证反馈清晰）
   使用固定的深靛蓝（与程序主色一致），避免暗色主题下 --color-accent 过亮导致白字看不清 */
.key-button.key-test-pressed {
  background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  box-shadow:
    0 1px 0 0 rgba(255, 255, 255, 0.2),
    0 2px 0 0 #4338ca,
    inset 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translateY(2px);
}

/* 测试模式：按下次数徽标（右下角） */
.test-count-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
  z-index: 2;
  background: #4f46e5;
  color: #fff;
  letter-spacing: 0;
}

/* 改键标识：该物理键位已被修改为发送其它功能（左上角「改」角标） */
.remap-badge {
  position: absolute;
  top: 1px;
  left: 1px;
  min-width: 13px;
  height: 13px;
  padding: 0 3px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  line-height: 13px;
  text-align: center;
  pointer-events: none;
  z-index: 2;
  background: var(--color-accent);
  color: #fff;
  letter-spacing: 0;
}

/* 改键后的功能名（主标签用主题色强调） */
.key-label-remapped {
  color: var(--color-accent);
  font-weight: 600;
}

/* 编辑模式 */
.key-editable {
  cursor: pointer;
}

.key-editable.key-healthy:hover {
  transform: translateY(-2px);
  box-shadow:
    var(--key-shadow),
    0 4px 8px rgba(0, 0, 0, 0.15);
}

.key-editable.key-healthy:active {
  transform: translateY(1px);
}

.key-editable.key-damaged:hover,
.key-editable.key-replaced:hover {
  transform: translateY(-2px);
}

.key-editable.key-damaged:active,
.key-editable.key-replaced:active {
  transform: translateY(1px);
}

/* Tooltip：水平位置用 --tip-x 控制（默认 -50% 居中；靠近视口边缘时由脚本夹紧为像素值） */
.key-tooltip {
  --tip-x: -50%;
  position: absolute;
  z-index: 100;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(var(--tip-x));
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  padding: 12px 14px;
  /* 时间与事件名称保持一行，避免 #序号 挤压中文标签。 */
  min-width: 280px;
  max-width: calc(100vw - 16px);
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

/* 顶部空间不足时翻转到键下方 */
.key-tooltip.key-tooltip-below {
  bottom: auto;
  top: calc(100% + 10px);
}

.key-tooltip.key-tooltip-below .tooltip-arrow {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: var(--color-surface-elevated);
}

.dark .key-tooltip {
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.03);
}

/* 固定状态 */
.key-tooltip-pinned {
  border-color: var(--color-accent);
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(99, 102, 241, 0.3);
}

.dark .key-tooltip-pinned {
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(129, 140, 248, 0.4);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pin-indicator {
  font-size: 11px;
  line-height: 1;
  opacity: 0.7;
  cursor: default;
}

.tooltip-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.tooltip-status.damaged {
  color: #ef4444;
}

.tooltip-status.replaced {
  color: #f59e0b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.tooltip-info {
  display: grid;
  grid-template-columns: 28px minmax(112px, 1fr) max-content;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.tooltip-label {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.tooltip-value {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

.tooltip-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  margin-left: 4px;
}

.tooltip-history {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.tooltip-event {
  padding: 6px 8px;
  background: var(--color-background);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-index {
  width: 22px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.replaced-info {
  --event-marker-color: var(--color-replaced);
}

.swap-info {
  --event-marker-color: var(--color-accent);
}

.event-marker {
  width: 22px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  color: var(--event-marker-color);
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
}

.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--color-surface-elevated);
}

/* Transition：仅淡入淡出，位置由 --tip-x 决定，避免夹紧时动画跳动 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(var(--tip-x)) translateY(4px);
}
</style>
