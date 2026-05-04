<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import KeyboardView from './components/KeyboardView.vue'
import CreateRecordModal from './components/CreateRecordModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import { KeyStatus, type KeyboardHealthRecord, type KeyHealth } from './types'

// 主题 - 默认亮色
const isDark = ref(false)

onMounted(() => {
  // 初始化主题 - 默认亮色，不添加 dark 类
  document.documentElement.classList.toggle('dark', isDark.value)
})

watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
})

// 所有键盘健康记录
const records = ref<KeyboardHealthRecord[]>([])

// 当前选中的记录 ID
const currentRecordId = ref<string>('')

// 编辑模式
const isEditMode = ref(false)

// 模态框状态
const showCreateModal = ref(false)
const showConfirmModal = ref(false)

// 下拉框展开状态
const isDropdownOpen = ref(false)

// 待保存的编辑记录
const pendingChanges = reactive<Record<string, KeyHealth>>({})
const hasChanges = ref(false)

// 当前选中的记录
const currentRecord = computed(() => {
  return records.value.find(r => r.id === currentRecordId.value)
})

// 合并当前记录和待保存的更改（编辑模式预览）
const displayKeys = computed(() => {
  if (!currentRecord.value) return {}
  if (isEditMode.value) {
    return { ...currentRecord.value.keys, ...pendingChanges }
  }
  return currentRecord.value.keys
})

// 创建新记录
const handleCreateRecord = (name: string) => {
  const newRecord: KeyboardHealthRecord = {
    id: Date.now().toString(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keys: {}
  }
  records.value.push(newRecord)
  currentRecordId.value = newRecord.id
  showCreateModal.value = false
}

// 选择记录
const selectRecord = (id: string) => {
  currentRecordId.value = id
  isDropdownOpen.value = false
}

// 切换编辑模式
const toggleEditMode = () => {
  if (isEditMode.value && hasChanges.value) {
    showConfirmModal.value = true
  } else {
    isEditMode.value = !isEditMode.value
    if (!isEditMode.value) {
      Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
      hasChanges.value = false
    }
  }
}

// 处理按键点击（编辑模式）
const handleKeyClick = (keyCode: string) => {
  if (!isEditMode.value) return

  const currentKeyHealth = pendingChanges[keyCode] || currentRecord.value?.keys[keyCode]
  const currentStatus = currentKeyHealth?.status || KeyStatus.HEALTHY
  const now = new Date().toISOString()

  let newStatus: KeyStatus
  let newHealth: KeyHealth

  if (currentStatus === KeyStatus.HEALTHY) {
    newStatus = KeyStatus.DAMAGED
    newHealth = {
      keyCode,
      status: newStatus,
      damagedAt: now
    }
  } else if (currentStatus === KeyStatus.DAMAGED) {
    newStatus = KeyStatus.REPLACED
    newHealth = {
      keyCode,
      status: newStatus,
      damagedAt: currentKeyHealth?.damagedAt,
      replacedAt: now
    }
  } else {
    newStatus = KeyStatus.HEALTHY
    newHealth = {
      keyCode,
      status: newStatus
    }
  }

  pendingChanges[keyCode] = newHealth
  hasChanges.value = true
}

// 保存更改
const saveChanges = () => {
  if (!currentRecord.value) return

  Object.entries(pendingChanges).forEach(([keyCode, health]) => {
    if (health.status === KeyStatus.HEALTHY) {
      delete currentRecord.value!.keys[keyCode]
    } else {
      currentRecord.value!.keys[keyCode] = health
    }
  })
  currentRecord.value.updatedAt = new Date().toISOString()

  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
  hasChanges.value = false
  isEditMode.value = false
  showConfirmModal.value = false
}

// 放弃更改
const discardChanges = () => {
  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key])
  hasChanges.value = false
  isEditMode.value = false
  showConfirmModal.value = false
}

// 获取更改摘要
const changesSummary = computed(() => {
  const changes: { damaged: string[], replaced: string[], healed: string[] } = {
    damaged: [],
    replaced: [],
    healed: []
  }

  Object.entries(pendingChanges).forEach(([keyCode, health]) => {
    const originalStatus = currentRecord.value?.keys[keyCode]?.status || KeyStatus.HEALTHY
    if (health.status === KeyStatus.DAMAGED && originalStatus !== KeyStatus.DAMAGED) {
      changes.damaged.push(keyCode)
    } else if (health.status === KeyStatus.REPLACED && originalStatus !== KeyStatus.REPLACED) {
      changes.replaced.push(keyCode)
    } else if (health.status === KeyStatus.HEALTHY && originalStatus !== KeyStatus.HEALTHY) {
      changes.healed.push(keyCode)
    }
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
  return { damaged, replaced, total: 104 }
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
  // 如果存在记录并且当前未选中任何记录，则默认选中第一个
  if (records.value.length > 0 && !currentRecordId.value) {
    currentRecordId.value = records.value[0].id
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  initUserData()

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
              <button class="dropdown-trigger" :class="{ 'dropdown-open': isDropdownOpen }" :disabled="isEditMode"
                @click.stop="isDropdownOpen = !isDropdownOpen">
                <span class="dropdown-value">{{ currentRecord?.name || '选择键盘' }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <Transition name="dropdown">
                <div v-if="isDropdownOpen && !isEditMode" class="dropdown-menu">
                  <button v-for="record in records" :key="record.id" class="dropdown-item"
                    :class="{ 'dropdown-item-active': record.id === currentRecordId }" @click="selectRecord(record.id)">
                    <span class="dropdown-item-name">{{ record.name }}</span>
                    <svg v-if="record.id === currentRecordId" class="dropdown-item-check" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- 右侧：主题切换 + 操作按钮 -->
        <div class="header-right">
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

          <!-- 编辑按钮 -->
          <button @click="toggleEditMode" :class="['btn', isEditMode ? 'btn-active' : 'btn-secondary']">
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
          <button @click="showCreateModal = true" :disabled="isEditMode" class="btn btn-primary">
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
              <span class="edit-banner-desc">点击按键循环切换状态：健康 → 损坏 → 更换 → 健康</span>
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
        <!-- 状态统计和图例 -->
        <div class="info-bar">
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

        <!-- 键盘视图 -->
        <KeyboardView :keys="displayKeys" :is-edit-mode="isEditMode" @key-click="handleKeyClick" />
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

    <!-- 确认保存模态框 -->
    <ConfirmModal v-if="showConfirmModal" title="保存更改" :changes="changesSummary" @save="saveChanges"
      @discard="discardChanges" @cancel="showConfirmModal = false" />
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
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.1s ease;
}

.dropdown-item:hover {
  background: var(--color-surface-hover);
}

.dropdown-item-active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.dropdown-item-active:hover {
  background: var(--color-accent-light);
}

.dropdown-item-name {
  font-weight: 500;
}

.dropdown-item-check {
  width: 16px;
  height: 16px;
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
</style>
