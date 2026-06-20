<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { KeyStatus, type KeyDefinition, type KeyHealth } from '../types'

const props = defineProps<{
  keyDef: KeyDefinition
  keyHealth?: KeyHealth
  isEditMode: boolean
  isTall?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const showTooltip = ref(false)
const isPinned = ref(false)
const historyListRef = ref<HTMLElement | null>(null)
const keyWrapperRef = ref<HTMLElement | null>(null)

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

// 工具提示是否可见
const tooltipVisible = computed(() => {
  if (!props.keyHealth || props.keyHealth.status === KeyStatus.HEALTHY) return false
  return showTooltip.value || isPinned.value
})

// 滚动历史记录列表到底部（最新记录）
const scrollHistoryToBottom = async () => {
  await nextTick()
  if (historyListRef.value) {
    historyListRef.value.scrollTop = historyListRef.value.scrollHeight
  }
}

// 按键点击处理
const handleClick = () => {
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
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick, true)
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
</script>

<template>
  <div ref="keyWrapperRef" class="key-wrapper">
    <button
      @click="handleClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      :style="{ width: keyWidth, height: keyHeight }"
      :class="[
        'key-button',
        statusClass,
        { 'key-editable': isEditMode }
      ]"
    >
      <span v-if="damageCount > 0" class="damage-count-badge">{{ damageCount }}</span>
      <span class="key-label">{{ keyDef.label }}</span>
    </button>

    <!-- Tooltip -->
    <Transition name="fade">
      <div 
        v-if="tooltipVisible"
        class="key-tooltip"
        :class="{ 'key-tooltip-pinned': isPinned }"
      >
        <div v-if="keyHealth!.status === KeyStatus.DAMAGED" class="tooltip-content">
          <div class="tooltip-header">
            <div class="tooltip-status damaged">
              <span class="status-dot"></span>
              损坏
              <span v-if="keyHealth!.history && keyHealth!.history.length > 1" class="tooltip-badge">第{{ keyHealth!.history.length }}次</span>
            </div>
            <span v-if="isPinned" class="pin-indicator" title="已固定，点击外部关闭">📌</span>
          </div>
          <!-- 历史记录列表 -->
          <div v-if="keyHealth!.history && keyHealth!.history.length > 0" ref="historyListRef" class="tooltip-history">
            <div v-for="(event, idx) in keyHealth!.history" :key="idx" class="tooltip-event">
              <div class="tooltip-info">
                <span class="tooltip-label">
                  <span class="event-index">#{{ idx + 1 }}</span> 损坏时间
                </span>
                <span class="tooltip-value">{{ formatDate(event.damagedAt) }}</span>
              </div>
              <div v-if="event.replacedAt" class="tooltip-info replaced-info">
                <span class="tooltip-label">更换时间</span>
                <span class="tooltip-value">{{ formatDate(event.replacedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="keyHealth!.status === KeyStatus.REPLACED" class="tooltip-content">
          <div class="tooltip-header">
            <div class="tooltip-status replaced">
              <span class="status-dot"></span>
              已更换
              <span v-if="keyHealth!.history && keyHealth!.history.length > 1" class="tooltip-badge">第{{ keyHealth!.history.length }}次</span>
            </div>
            <span v-if="isPinned" class="pin-indicator" title="已固定，点击外部关闭">📌</span>
          </div>
          <!-- 历史记录列表 -->
          <div v-if="keyHealth!.history && keyHealth!.history.length > 0" ref="historyListRef" class="tooltip-history">
            <div v-for="(event, idx) in keyHealth!.history" :key="idx" class="tooltip-event">
              <div class="tooltip-info">
                <span class="tooltip-label">
                  <span class="event-index">#{{ idx + 1 }}</span> 损坏时间
                </span>
                <span class="tooltip-value">{{ formatDate(event.damagedAt) }}</span>
              </div>
              <div v-if="event.replacedAt" class="tooltip-info replaced-info">
                <span class="tooltip-label">更换时间</span>
                <span class="tooltip-value">{{ formatDate(event.replacedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="tooltip-arrow"></div>
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

/* Tooltip */
.key-tooltip {
  position: absolute;
  z-index: 100;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 180px;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.05);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.tooltip-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.tooltip-value {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
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
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  margin-right: 2px;
}

.replaced-info {
  padding-left: 12px;
  border-left: 2px solid var(--color-replaced);
}

.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--color-surface-elevated);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
