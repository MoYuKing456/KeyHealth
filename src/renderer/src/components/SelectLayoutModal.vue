<script setup lang="ts">
import { computed } from 'vue'
import { layoutOptions } from '../data/keyboardLayout'
import type { KeyboardLayoutType } from '../types'

const props = defineProps<{
  recordName: string
  // 当前布局；旧数据（无 layout）时为空
  currentLayout?: KeyboardLayoutType
  // 各布局的禁用原因（为空字符串表示可用）
  disabledReasons: Partial<Record<KeyboardLayoutType, string>>
}>()

const emit = defineEmits<{
  select: [layout: KeyboardLayoutType]
  cancel: []
}>()

// 旧数据（无布局）时使用提示语气
const isLegacy = computed(() => !props.currentLayout)

const handleSelect = (layout: KeyboardLayoutType) => {
  if (props.disabledReasons[layout]) return
  emit('select', layout)
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleBackdropClick">
      <Transition name="modal" appear>
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <line x1="6" y1="10" x2="6" y2="10.01" stroke-width="2" stroke-linecap="round" />
                <line x1="10" y1="10" x2="10" y2="10.01" stroke-width="2" stroke-linecap="round" />
                <line x1="14" y1="10" x2="14" y2="10.01" stroke-width="2" stroke-linecap="round" />
                <line x1="18" y1="10" x2="18" y2="10.01" stroke-width="2" stroke-linecap="round" />
                <line x1="6" y1="14" x2="18" y2="14" stroke-linecap="round" />
              </svg>
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">{{ isLegacy ? '选择键盘布局' : '更换键盘布局' }}</h2>
              <p class="modal-subtitle">
                <template v-if="isLegacy">
                  「{{ recordName }}」来自旧版本，请选择它的键盘布局以正确显示
                </template>
                <template v-else>
                  当前布局：{{layoutOptions.find(o => o.type === currentLayout)?.name || currentLayout}}
                </template>
              </p>
            </div>
            <button @click="emit('cancel')" class="modal-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <div class="layout-options">
              <button v-for="opt in layoutOptions" :key="opt.type" type="button" class="layout-option" :class="{
                'layout-option-active': currentLayout === opt.type,
                'layout-option-disabled': !!disabledReasons[opt.type]
              }" :disabled="!!disabledReasons[opt.type]" @click="handleSelect(opt.type)">
                <span class="layout-option-name">{{ opt.name }}</span>
                <span class="layout-option-desc">{{ opt.description }}</span>
                <span v-if="disabledReasons[opt.type]" class="layout-option-reason">{{ disabledReasons[opt.type]
                  }}</span>
                <svg v-else-if="currentLayout === opt.type" class="layout-option-check" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
            <p v-if="Object.keys(disabledReasons).length > 0" class="layout-warning">
              部分布局不可用：切换到该布局会隐藏已有的键位健康数据
            </p>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="emit('cancel')" class="btn btn-ghost">
              {{ isLegacy ? '稍后选择' : '取消' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 20px 0;
  position: relative;
}

.modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-icon svg {
  width: 20px;
  height: 20px;
  color: var(--color-accent);
}

.modal-title-group {
  flex: 1;
  padding-right: 32px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.5;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 20px;
}

.layout-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.layout-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.layout-option:hover:not(:disabled) {
  border-color: var(--color-border-light);
  background: var(--color-surface-hover);
}

.layout-option-active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.layout-option-active:hover:not(:disabled) {
  background: var(--color-accent-light);
}

.layout-option-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.layout-option-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.layout-option-active .layout-option-name {
  color: var(--color-accent);
}

.layout-option-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.layout-option-reason {
  font-size: 10px;
  color: var(--color-damaged);
  line-height: 1.4;
  word-break: break-all;
}

.layout-option-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 16px;
  height: 16px;
  color: var(--color-accent);
}

.layout-warning {
  font-size: 12px;
  color: var(--color-damaged);
  margin-top: 12px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
