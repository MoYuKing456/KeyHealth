<script setup lang="ts">
defineProps<{
  recordName: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleBackdropClick">
      <Transition name="modal" appear>
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-icon danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">删除记录</h2>
              <p class="modal-subtitle">确定要删除键盘记录「{{ recordName }}」吗？此操作不可恢复。</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="emit('cancel')" class="btn btn-ghost">
              取消
            </button>
            <button @click="emit('confirm')" class="btn btn-danger">
              确认删除
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
}

.modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-icon.danger {
  background: var(--color-damaged-light);
}

.modal-icon.danger svg {
  width: 22px;
  height: 22px;
  color: var(--color-damaged);
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
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border);
  margin-top: 24px;
}

.btn {
  padding: 10px 16px;
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

.btn-danger {
  background: var(--color-damaged);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
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
