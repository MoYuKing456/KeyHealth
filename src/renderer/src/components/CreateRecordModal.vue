<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
  create: [name: string]
}>()

const recordName = ref('')

const handleCreate = () => {
  if (recordName.value.trim()) {
    emit('create', recordName.value.trim())
  }
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="modal-overlay"
      @click="handleBackdropClick"
    >
      <Transition name="modal" appear>
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">创建新的健康记录</h2>
              <p class="modal-subtitle">为你的键盘创建一份健康档案</p>
            </div>
            <button @click="emit('close')" class="modal-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <label class="input-label">记录名称</label>
            <input
              v-model="recordName"
              type="text"
              placeholder="例如：Cherry MX 机械键盘"
              class="input-field"
              @keyup.enter="handleCreate"
              autofocus
            />
            <p class="input-hint">建议使用键盘型号或用途命名，便于后续识别</p>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="emit('close')" class="btn btn-ghost">
              取消
            </button>
            <button
              @click="handleCreate"
              :disabled="!recordName.trim()"
              class="btn btn-primary"
            >
              创建记录
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
  max-width: 420px;
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

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--color-text-primary);
  transition: all 0.15s ease;
}

.input-field::placeholder {
  color: var(--color-text-muted);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.input-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 8px;
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
