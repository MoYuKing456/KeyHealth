<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import SearchableSelect from './SearchableSelect.vue'
import { collectLayoutKeys, getRemapTargetOptions, getKeyFunctionLabel, getKeyboardLayout, validateRemap } from '../data/keyboardLayout'
import { KeyStatus } from '../types'
import type { KeyboardLayout, KeyboardLayoutType, KeyHealth } from '../types'

const props = defineProps<{
  recordName: string
  layoutType: KeyboardLayoutType
  // 当前改键配置
  remap: Record<string, string>
  // 键位健康数据（用于提示含损坏记录的键位改键不影响健康数据）
  keys: Record<string, KeyHealth>
}>()

const emit = defineEmits<{
  save: [remap: Record<string, string>]
  cancel: []
}>()

// 布局（用于校验与来源候选）
const layout = computed<KeyboardLayout>(() => getKeyboardLayout(props.layoutType))

// 草稿改键配置：保存前可自由增删
const draftRemap = reactive<Record<string, string>>({ ...props.remap })

// 源按键候选：布局内、尚未被改键的物理键位
const sourceOptions = computed(() => {
  return collectLayoutKeys(layout.value)
    .filter(k => !Object.prototype.hasOwnProperty.call(draftRemap, k.code))
    .map(k => ({ code: k.code, label: k.label || k.code }))
})

// 目标功能候选：当前未被使用的功能
const targetOptions = computed(() => getRemapTargetOptions(layout.value, { ...draftRemap }))

const selectedSource = ref('')
const selectedTarget = ref('')
const validationError = ref('')

// 某键位是否已有损坏/更换记录（改键不影响健康数据的一致性提示）
const hasHealthData = (code: string): boolean => {
  const h = props.keys[code]
  return !!h && h.status !== KeyStatus.HEALTHY
}

const handleAdd = (): void => {
  const err = validateRemap(layout.value, { ...draftRemap }, selectedSource.value, selectedTarget.value)
  if (err) {
    validationError.value = err
    return
  }
  draftRemap[selectedSource.value] = selectedTarget.value
  selectedSource.value = ''
  selectedTarget.value = ''
  validationError.value = ''
}

const handleRemove = (source: string): void => {
  delete draftRemap[source]
  validationError.value = ''
}

const handleSave = (): void => {
  // 移除空值/自映射等异常项，保证数据文件一致性
  const clean: Record<string, string> = {}
  for (const [s, t] of Object.entries(draftRemap)) {
    if (s && t && s !== t) clean[s] = t
  }
  emit('save', clean)
}

const handleBackdropClick = (e: MouseEvent): void => {
  if (e.target === e.currentTarget) emit('cancel')
}

// 当前改键条目（含来源/目标标签与健康提示）
const remapItems = computed(() =>
  Object.entries(draftRemap).map(([source, target]) => ({
    source,
    sourceLabel: getKeyFunctionLabel(source),
    target,
    targetLabel: getKeyFunctionLabel(target),
    hasDamage: hasHealthData(source)
  }))
)
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
                <path d="M4 8h16M9 4l-1 4m7-4l1 4M4 12h6l3-2 2 1-3 2-2-1-6 3 2 6" />
                <path d="M15 14l4 3-4 3m4-6l-4 3" />
              </svg>
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">按键功能修改</h2>
              <p class="modal-subtitle">
                「{{ recordName }}」· 当前布局 {{ layoutType }} 键 · 模拟驱动改键
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
            <!-- 添加修改（置顶，改键多时无需滚动即可添加） -->
            <div class="remap-add">
              <div class="remap-section-title">添加修改</div>
              <div class="remap-form">
                <div class="remap-field">
                  <span class="remap-field-label">源按键</span>
                  <SearchableSelect v-model="selectedSource" :options="sourceOptions" placeholder="搜索键位" />
                </div>
                <svg class="remap-form-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <div class="remap-field">
                  <span class="remap-field-label">目标功能</span>
                  <SearchableSelect v-model="selectedTarget" :options="targetOptions" placeholder="搜索功能" />
                </div>
                <button type="button" class="remap-add-btn" @click="handleAdd">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加
                </button>
              </div>
              <p v-if="validationError" class="remap-error">{{ validationError }}</p>
              <p v-else class="remap-hint">
                目标功能会排除已被当前键盘使用的功能，确保不会出现两个按键发送同一功能。
              </p>
            </div>

            <!-- 当前修改列表 -->
            <div class="remap-list-section">
              <div class="remap-section-title">当前修改（{{ remapItems.length }}）</div>
              <div v-if="remapItems.length === 0" class="remap-empty">
                尚未修改任何按键
              </div>
              <div v-else class="remap-list">
                <div v-for="item in remapItems" :key="item.source" class="remap-item">
                  <div class="remap-item-keys">
                    <span class="remap-chip">{{ item.sourceLabel }}</span>
                    <svg class="remap-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span class="remap-chip remap-chip-target">{{ item.targetLabel }}</span>
                    <span v-if="item.hasDamage" class="remap-damage-tag" title="该键位已有损坏/更换记录；改键只改变功能，不会影响其健康数据">含损坏记录</span>
                  </div>
                  <button class="remap-remove" title="移除该修改" @click="handleRemove(item.source)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="remap-note">
              改键只改变按键发送的功能，不影响该键位已有的健康记录（损坏 / 更换历史）；
              修改后可在「测试模式」或「后台记录」中直接测试该按键。
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="emit('cancel')" class="btn btn-ghost">取消</button>
            <button class="btn btn-primary" @click="handleSave">保存修改</button>
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
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 18px 0;
  position: relative;
  flex-shrink: 0;
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
  flex: 1;
  min-height: 0;
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.remap-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.remap-empty {
  font-size: 13px;
  color: var(--color-text-muted);
  background: var(--color-background);
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}

.remap-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.remap-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 10px 8px 12px;
}

.remap-item-keys {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.remap-chip {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  padding: 3px 8px;
  white-space: nowrap;
}

.remap-chip-target {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.remap-arrow {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.remap-damage-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-damaged);
  background: var(--color-damaged-light);
  border-radius: 5px;
  padding: 2px 6px;
  white-space: nowrap;
  cursor: help;
}

.remap-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.remap-remove:hover {
  background: var(--color-damaged-light);
  color: var(--color-damaged);
}

.remap-remove svg {
  width: 15px;
  height: 15px;
}

.remap-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.remap-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.remap-field-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.remap-form-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  margin-bottom: 11px;
  flex-shrink: 0;
}

.remap-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.remap-add-btn:hover {
  background: var(--color-accent-hover);
}

.remap-add-btn svg {
  width: 14px;
  height: 14px;
}

.remap-error {
  font-size: 12px;
  color: var(--color-damaged);
  line-height: 1.5;
  margin-top: 8px;
}

.remap-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-top: 8px;
}

.remap-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-accent-light);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  padding: 10px 12px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
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
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}
</style>
