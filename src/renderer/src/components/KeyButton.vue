<script setup lang="ts">
import { computed, ref } from 'vue'
import { KeyStatus, type KeyDefinition, type KeyHealth } from '../types'

const props = defineProps<{
  keyDef: KeyDefinition
  keyHealth?: KeyHealth
  isEditMode: boolean
  isTall?: boolean
}>()

defineEmits<{
  click: []
}>()

const showTooltip = ref(false)

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
  <div class="key-wrapper">
    <button
      @click="$emit('click')"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      :style="{ width: keyWidth, height: keyHeight }"
      :class="[
        'key-button',
        statusClass,
        { 'key-editable': isEditMode }
      ]"
    >
      <span class="key-label">{{ keyDef.label }}</span>
    </button>

    <!-- Tooltip -->
    <Transition name="fade">
      <div 
        v-if="showTooltip && keyHealth && keyHealth.status !== KeyStatus.HEALTHY"
        class="key-tooltip"
      >
        <div v-if="keyHealth.status === KeyStatus.DAMAGED" class="tooltip-content">
          <div class="tooltip-status damaged">
            <span class="status-dot"></span>
            损坏
          </div>
          <div class="tooltip-info">
            <span class="tooltip-label">损坏时间</span>
            <span class="tooltip-value">{{ formatDate(keyHealth.damagedAt) }}</span>
          </div>
        </div>
        <div v-else-if="keyHealth.status === KeyStatus.REPLACED" class="tooltip-content">
          <div class="tooltip-status replaced">
            <span class="status-dot"></span>
            已更换
          </div>
          <div class="tooltip-info">
            <span class="tooltip-label">损坏时间</span>
            <span class="tooltip-value">{{ formatDate(keyHealth.damagedAt) }}</span>
          </div>
          <div class="tooltip-info">
            <span class="tooltip-label">更换时间</span>
            <span class="tooltip-value">{{ formatDate(keyHealth.replacedAt) }}</span>
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

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
