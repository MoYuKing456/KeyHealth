<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { keyboardLayout } from '../data/keyboardLayout'
import KeyButton from './KeyButton.vue'
import { KeyStatus, type KeyHealth } from '../types'

const props = defineProps<{
  keys: Record<string, KeyHealth>
  isEditMode: boolean
}>()

const emit = defineEmits<{
  keyClick: [keyCode: string]
  switchMove: [sourceKeyCode: string, targetKeyCode: string]
}>()

const keyboardRef = ref<HTMLElement | null>(null)
const LONG_PRESS_MS = 450
const DRAG_THRESHOLD_PX = 6

let longPressTimer: ReturnType<typeof setTimeout> | undefined
let pointerId: number | null = null
let pressStart: { x: number, y: number } | null = null
let sourceKeyCode: string | null = null
let sourceButton: HTMLElement | null = null
let targetButton: HTMLElement | null = null
let isDragging = false

const getButtonFromTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>('[data-key-code]')
}

const getButtonAtPoint = (x: number, y: number): HTMLElement | null => {
  return getButtonFromTarget(document.elementFromPoint(x, y))
}

const getStatus = (keyCode: string): KeyStatus => props.keys[keyCode]?.status || KeyStatus.HEALTHY

const clearDrag = () => {
  if (longPressTimer) clearTimeout(longPressTimer)
  longPressTimer = undefined
  sourceButton?.classList.remove('key-drag-source')
  targetButton?.classList.remove('key-drag-target')
  if (pointerId !== null && keyboardRef.value?.hasPointerCapture(pointerId)) {
    keyboardRef.value.releasePointerCapture(pointerId)
  }
  pointerId = null
  pressStart = null
  sourceKeyCode = null
  sourceButton = null
  targetButton = null
  isDragging = false
}

const updateDropTarget = (x: number, y: number) => {
  const candidate = getButtonAtPoint(x, y)
  const candidateCode = candidate?.dataset.keyCode
  const isValidTarget = !!candidateCode && candidateCode !== sourceKeyCode && getStatus(candidateCode) === KeyStatus.DAMAGED

  if (candidate === targetButton && isValidTarget) return
  targetButton?.classList.remove('key-drag-target')
  targetButton = isValidTarget ? candidate : null
  targetButton?.classList.add('key-drag-target')
}

const ignoreDraggedClick = (button: HTMLElement | null) => {
  if (!button) return
  button.dataset.ignoreNextClick = 'true'
  // 若浏览器因 pointerup.preventDefault() 不派发 click，立即清理，避免影响该键位的下次正常点击。
  setTimeout(() => {
    delete button.dataset.ignoreNextClick
  }, 0)
}

const handlePointerDown = (event: PointerEvent) => {
  if (!props.isEditMode || event.button !== 0) return

  const button = getButtonFromTarget(event.target)
  const keyCode = button?.dataset.keyCode
  if (!button || !keyCode) return

  // 只有健康轴或已更换轴可以作为可拆下的来源；损坏轴只能作为放置目标。
  const status = getStatus(keyCode)
  if (status !== KeyStatus.HEALTHY && status !== KeyStatus.REPLACED) return

  pointerId = event.pointerId
  keyboardRef.value?.setPointerCapture(event.pointerId)
  pressStart = { x: event.clientX, y: event.clientY }
  sourceKeyCode = keyCode
  sourceButton = button
  longPressTimer = setTimeout(() => {
    isDragging = true
    sourceButton?.classList.add('key-drag-source')
    updateDropTarget(event.clientX, event.clientY)
  }, LONG_PRESS_MS)
}

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerId !== pointerId) return

  if (!isDragging) {
    const moved = pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y)
    if (moved && moved > DRAG_THRESHOLD_PX) clearDrag()
    return
  }

  event.preventDefault()
  updateDropTarget(event.clientX, event.clientY)
}

const handlePointerUp = (event: PointerEvent) => {
  if (event.pointerId !== pointerId) return

  if (isDragging) {
    event.preventDefault()
    // click 若仍被浏览器派发，只忽略本次拖动涉及的按钮；绝不影响其他正常点击。
    ignoreDraggedClick(sourceButton)
    ignoreDraggedClick(targetButton)
    const targetKeyCode = targetButton?.dataset.keyCode
    if (sourceKeyCode && targetKeyCode) emit('switchMove', sourceKeyCode, targetKeyCode)
  } else if (sourceKeyCode) {
    // 短按 = 点击：setPointerCapture 会把 click 事件重定向到键盘容器，
    // 导致按钮收不到点击，因此这里直接发出 keyClick。
    // 同时给按钮打上忽略标记，防止某些浏览器仍在按钮上派发 click 造成重复触发。
    ignoreDraggedClick(sourceButton)
    emit('keyClick', sourceKeyCode)
  }
  clearDrag()
}

onUnmounted(() => {
  clearDrag()
})
</script>

<template>
  <div ref="keyboardRef" class="keyboard-container" :class="{ 'keyboard-editing': isEditMode }"
    @pointerdown.capture="handlePointerDown" @pointermove.capture="handlePointerMove"
    @pointerup.capture="handlePointerUp" @pointercancel.capture="clearDrag">
    <!-- 键盘外壳 -->
    <div class="keyboard-frame">
      <div class="keyboard-inner">
        <!-- 主键盘 + 导航区 + 小键盘 -->
        <div class="keyboard-layout">
          <!-- 左侧：主键盘区域 -->
          <div class="main-section">
            <!-- 功能键行 (Esc 单独 | F1-F4 | F5-F8 | F9-F12) -->
            <div class="function-row">
              <!-- Esc 单独 -->
              <div class="key-group">
                <KeyButton v-for="key in keyboardLayout.functionRow.escape" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- ESC 后的大间隔 -->
              <div class="function-spacer-large"></div>
              <!-- F1-F4 -->
              <div class="key-group">
                <KeyButton v-for="key in keyboardLayout.functionRow.f1_f4" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- F 键组之间的小间隔 -->
              <div class="function-spacer-small"></div>
              <!-- F5-F8 -->
              <div class="key-group">
                <KeyButton v-for="key in keyboardLayout.functionRow.f5_f8" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- F 键组之间的小间隔 -->
              <div class="function-spacer-small"></div>
              <!-- F9-F12 -->
              <div class="key-group">
                <KeyButton v-for="key in keyboardLayout.functionRow.f9_f12" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>

            <!-- 主键盘区域（数字行到空格行） -->
            <div class="main-keys">
              <div v-for="(row, rowIndex) in keyboardLayout.mainArea" :key="`main-${rowIndex}`" class="key-row">
                <KeyButton v-for="key in row.keys" :key="key.code" :key-def="key" :key-health="keys[key.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>
          </div>

          <!-- 中间：导航区域 -->
          <div class="nav-section">
            <!-- 导航功能键行 (PrtSc, ScrLk, Pause) - 与主键盘功能键行对齐 -->
            <div class="function-row">
              <div class="key-group">
                <KeyButton v-for="key in keyboardLayout.navigationFunctionRow" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>

            <!-- 导航主体区域 -->
            <div class="nav-keys">
              <div v-for="(row, rowIndex) in keyboardLayout.navigationArea" :key="`nav-${rowIndex}`" class="key-row">
                <KeyButton v-for="key in row.keys" :key="key.code" :key-def="key" :key-health="keys[key.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>

              <!-- 空白行（用于对齐方向键） -->
              <div class="spacer-row"></div>

              <!-- 方向键区域 -->
              <div class="arrow-keys">
                <!-- 上方向键 -->
                <div class="arrow-row-up">
                  <KeyButton :key-def="keyboardLayout.arrowKeys.up" :key-health="keys[keyboardLayout.arrowKeys.up.code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', keyboardLayout.arrowKeys.up.code)" />
                </div>
                <!-- 左、下、右方向键 -->
                <div class="arrow-row-bottom">
                  <KeyButton :key-def="keyboardLayout.arrowKeys.left"
                    :key-health="keys[keyboardLayout.arrowKeys.left.code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.arrowKeys.left.code)" />
                  <KeyButton :key-def="keyboardLayout.arrowKeys.down"
                    :key-health="keys[keyboardLayout.arrowKeys.down.code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.arrowKeys.down.code)" />
                  <KeyButton :key-def="keyboardLayout.arrowKeys.right"
                    :key-health="keys[keyboardLayout.arrowKeys.right.code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.arrowKeys.right.code)" />
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：数字小键盘区域 -->
          <div class="numpad-section">
            <!-- 小键盘功能键行 (Num, /, *, -) - 占位行，与 PrtSc 行对齐 -->
            <div class="function-row">
              <!-- 空白占位，使小键盘主体与 Insert 行对齐 -->
            </div>

            <!-- 小键盘主体区域 -->
            <div class="numpad-body">
              <!-- 第一行: Num / * - -->
              <div class="key-row">
                <KeyButton v-for="key in keyboardLayout.numpadFunctionRow" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>

              <!-- 使用 CSS Grid 布局数字区 -->
              <div class="numpad-grid">
                <!-- 第1行: 7 8 9 -->
                <div class="numpad-cell" style="grid-area: r1c1;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row1[0]"
                    :key-health="keys[keyboardLayout.numpadArea.row1[0].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row1[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r1c2;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row1[1]"
                    :key-health="keys[keyboardLayout.numpadArea.row1[1].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row1[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r1c3;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row1[2]"
                    :key-health="keys[keyboardLayout.numpadArea.row1[2].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row1[2].code)" />
                </div>
                <!-- + 键跨2行 -->
                <div class="numpad-cell numpad-tall" style="grid-area: plus;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.plus"
                    :key-health="keys[keyboardLayout.numpadArea.plus.code]" :is-edit-mode="isEditMode" :is-tall="true"
                    @click="emit('keyClick', keyboardLayout.numpadArea.plus.code)" />
                </div>

                <!-- 第2行: 4 5 6 -->
                <div class="numpad-cell" style="grid-area: r2c1;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row2[0]"
                    :key-health="keys[keyboardLayout.numpadArea.row2[0].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row2[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r2c2;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row2[1]"
                    :key-health="keys[keyboardLayout.numpadArea.row2[1].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row2[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r2c3;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row2[2]"
                    :key-health="keys[keyboardLayout.numpadArea.row2[2].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row2[2].code)" />
                </div>

                <!-- 第3行: 1 2 3 -->
                <div class="numpad-cell" style="grid-area: r3c1;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row3[0]"
                    :key-health="keys[keyboardLayout.numpadArea.row3[0].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row3[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r3c2;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row3[1]"
                    :key-health="keys[keyboardLayout.numpadArea.row3[1].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row3[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r3c3;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row3[2]"
                    :key-health="keys[keyboardLayout.numpadArea.row3[2].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row3[2].code)" />
                </div>
                <!-- Enter 键跨2行 -->
                <div class="numpad-cell numpad-tall" style="grid-area: enter;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.enter"
                    :key-health="keys[keyboardLayout.numpadArea.enter.code]" :is-edit-mode="isEditMode" :is-tall="true"
                    @click="emit('keyClick', keyboardLayout.numpadArea.enter.code)" />
                </div>

                <!-- 第4行: 0 (跨2列) . -->
                <div class="numpad-cell numpad-wide" style="grid-area: zero;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row4[0]"
                    :key-health="keys[keyboardLayout.numpadArea.row4[0].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row4[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: dot;">
                  <KeyButton :key-def="keyboardLayout.numpadArea.row4[1]"
                    :key-health="keys[keyboardLayout.numpadArea.row4[1].code]" :is-edit-mode="isEditMode"
                    @click="emit('keyClick', keyboardLayout.numpadArea.row4[1].code)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keyboard-container {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.keyboard-editing {
  user-select: none;
}

:deep(.key-button.key-drag-source) {
  opacity: 0.55;
  transform: scale(0.96);
  cursor: grabbing;
}

:deep(.key-button.key-drag-target) {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.keyboard-frame {
  background: var(--keyboard-frame-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--keyboard-frame-shadow);
}

.keyboard-inner {
  background: var(--keyboard-inner-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
}

.keyboard-layout {
  display: flex;
  gap: calc(var(--key-size) * 0.5);
}

.main-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--key-size) * 0.4);
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--key-size) * 0.4);
}

.numpad-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--key-size) * 0.4);
}

.function-row {
  display: flex;
  align-items: center;
  height: var(--key-size);
}

/* 功能键行的间隔 - ESC 后面的大间隔（约1个键宽） */
.function-spacer-large {
  width: calc(var(--key-size) * 0.75);
}

/* F键组之间的小间隔（约半个键宽） */
.function-spacer-small {
  width: calc(var(--key-size) * 0.5);
}

.main-keys {
  display: flex;
  flex-direction: column;
  gap: var(--key-gap);
}

.nav-keys {
  display: flex;
  flex-direction: column;
  gap: var(--key-gap);
}

.numpad-body {
  display: flex;
  flex-direction: column;
  gap: var(--key-gap);
}

.key-row {
  display: flex;
  gap: var(--key-gap);
}

.key-group {
  display: flex;
  gap: var(--key-gap);
}

.spacer-row {
  height: var(--key-size);
}

.arrow-keys {
  display: flex;
  flex-direction: column;
  gap: var(--key-gap);
}

.arrow-row-up {
  display: flex;
  justify-content: center;
}

.arrow-row-bottom {
  display: flex;
  gap: var(--key-gap);
}

/* 小键盘 Grid 布局 - 精确的 4列 x 4行 */
.numpad-grid {
  display: grid;
  grid-template-columns: repeat(4, var(--key-size));
  grid-template-rows: repeat(4, var(--key-size));
  gap: var(--key-gap);
  grid-template-areas:
    "r1c1 r1c2 r1c3 plus"
    "r2c1 r2c2 r2c3 plus"
    "r3c1 r3c2 r3c3 enter"
    "zero zero dot  enter";
}

.numpad-cell {
  display: flex;
}

.numpad-tall {
  align-items: stretch;
}

/* .numpad-wide {
  // 0 键宽度由 KeyButton 控制
} */
</style>
