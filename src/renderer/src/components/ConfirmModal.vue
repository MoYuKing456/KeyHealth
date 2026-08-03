<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  changes: {
    damaged: string[]
    redamaged: string[]
    replaced: string[]
    healed: string[]
  }
}>()

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()

// 每种变更类型的展示配置
const changeTypes = [
  { key: 'damaged', label: '损坏', badgeClass: 'damaged' },
  { key: 'redamaged', label: '再次损坏', badgeClass: 'redamaged' },
  { key: 'replaced', label: '更换', badgeClass: 'replaced' },
  { key: 'healed', label: '恢复', badgeClass: 'healed' }
] as const

// 折叠状态下最多直接展示的条数
const VISIBLE_LIMIT = 5

// 各类型的展开状态（超出上限时可展开查看完整列表）
const expanded = ref<Record<string, boolean>>({})

const toggleExpand = (key: string) => {
  expanded.value[key] = !expanded.value[key]
}

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
            <div class="modal-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">{{ title }}</h2>
              <p class="modal-subtitle">您有未保存的更改，是否保存？</p>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <div class="changes-summary">
              <p class="summary-label">本次编辑摘要</p>

              <div class="changes-list">
                <div v-for="item in changeTypes" :key="item.key" v-show="changes[item.key].length > 0"
                  class="change-item">
                  <div class="change-badge" :class="item.badgeClass">
                    <span class="badge-dot"></span>
                    {{ item.label }}
                  </div>
                  <span class="change-count">{{ changes[item.key].length }} 次操作</span>
                  <div class="change-keys">
                    <template v-if="!expanded[item.key]">
                      {{ changes[item.key].slice(0, VISIBLE_LIMIT).join(', ') }}
                    </template>
                    <div v-else class="change-keys-full">
                      <span v-for="(keyCode, idx) in changes[item.key]" :key="idx" class="key-chip">{{ keyCode }}</span>
                    </div>
                    <button v-if="changes[item.key].length > VISIBLE_LIMIT" class="change-toggle"
                      :class="{ 'expanded': expanded[item.key] }" @click.stop="toggleExpand(item.key)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      {{ expanded[item.key] ? '收起' : `查看全部 ${changes[item.key].length} 条` }}
                    </button>
                  </div>
                </div>

                <p v-if="changes.damaged.length === 0 && changes.redamaged.length === 0 && changes.replaced.length === 0 && changes.healed.length === 0"
                  class="no-changes">
                  无更改
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="emit('cancel')" class="btn btn-ghost">
              继续编辑
            </button>
            <button @click="emit('discard')" class="btn btn-danger">
              放弃更改
            </button>
            <button @click="emit('save')" class="btn btn-primary">
              保存并退出
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

.modal-icon.warning {
  background: rgba(245, 158, 11, 0.15);
}

.modal-icon.warning svg {
  width: 22px;
  height: 22px;
  color: #f59e0b;
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

.modal-body {
  padding: 20px;
}

.changes-summary {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
}

.summary-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.change-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.change-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.change-badge.damaged {
  background: var(--color-damaged-light);
  color: #f87171;
}

.change-badge.redamaged {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}

.change-badge.replaced {
  background: var(--color-replaced-light);
  color: #fbbf24;
}

.change-badge.healed {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.change-count {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.change-keys {
  width: 100%;
  font-size: 11px;
  color: var(--color-text-muted);
  padding-left: 16px;
  font-family: monospace;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* 展开后的完整列表：标签块形式展示，过长时可滚动 */
.change-keys-full {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
  width: 100%;
}

.key-chip {
  padding: 2px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
}

.change-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: inherit;
}

.change-toggle:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.change-toggle svg {
  width: 12px;
  height: 12px;
  transition: transform 0.2s;
}

.change-toggle.expanded svg {
  transform: rotate(180deg);
}

.no-changes {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px 0;
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
  background: transparent;
  color: #f87171;
}

.btn-danger:hover {
  background: var(--color-damaged-light);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
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
