<script setup lang="ts">
import { onUnmounted, ref, computed, provide } from 'vue'
import KeyButton from './KeyButton.vue'
import { KeyStatus, type KeyHealth, type KeyboardLayout } from '../types'

const props = defineProps<{
  keys: Record<string, KeyHealth>
  isEditMode: boolean
  layout: KeyboardLayout
  // 测试模式（键盘按压可视化）
  testMode?: boolean
  testPressed?: Record<string, boolean>
  testPressCounts?: Record<string, number>
  testHideStatus?: boolean
}>()

const emit = defineEmits<{
  keyClick: [keyCode: string]
  switchMove: [sourceKeyCode: string, targetKeyCode: string]
}>()

// 测试模式状态：通过 provide 提供给所有 KeyButton（避免在每个调用处重复传 props）
provide('testState', computed(() => ({
  testMode: props.testMode || false,
  pressedKeys: props.testPressed || {},
  pressCounts: props.testPressCounts || {},
  hideStatus: props.testHideStatus || false
})))

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
  <div ref="keyboardRef" class="keyboard-container" :class="[
    { 'keyboard-editing': isEditMode, 'keyboard-testing': testMode },
    { 'keyboard-test-hide-status': testHideStatus },
    `layout-${layout.id}`
  ]" @pointerdown.capture="handlePointerDown" @pointermove.capture="handlePointerMove"
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
                <KeyButton v-for="key in layout.functionRow.escape" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- ESC 后的大间隔 -->
              <div class="function-spacer-large"></div>
              <!-- F1-F4 -->
              <div class="key-group">
                <KeyButton v-for="key in layout.functionRow.f1_f4" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- F 键组之间的小间隔 -->
              <div class="function-spacer-small"></div>
              <!-- F5-F8 -->
              <div class="key-group">
                <KeyButton v-for="key in layout.functionRow.f5_f8" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
              <!-- F 键组之间的小间隔 -->
              <div class="function-spacer-small"></div>
              <!-- F9-F12 -->
              <div class="key-group">
                <KeyButton v-for="key in layout.functionRow.f9_f12" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>

            <!-- 主键盘区域（数字行到空格行） -->
            <div class="main-keys">
              <div v-for="(row, rowIndex) in layout.mainArea" :key="`main-${rowIndex}`" class="key-row">
                <KeyButton v-for="key in row.keys" :key="key.code" :key-def="key" :key-health="keys[key.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>
          </div>

          <!-- 中间：导航区域（104/87 渲染；98 布局当前不渲染，数字区直接与主键盘区贴合） -->
          <div v-if="layout.showNavSection" class="nav-section">
            <!-- 导航顶部行：PrtSc/ScrLk/Pause -->
            <div class="function-row">
              <div v-if="layout.navigationFunctionRow.length > 0" class="key-group">
                <KeyButton v-for="key in layout.navigationFunctionRow" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>

            <!-- 导航主体区域（编辑键 + 空白行 + 方向键） -->
            <div class="nav-keys">
              <!-- 编辑键：3 列横排 -->
              <div v-for="(row, rowIndex) in layout.navigationArea" :key="`nav-${rowIndex}`" class="key-row">
                <KeyButton v-for="key in row.keys" :key="key.code" :key-def="key" :key-health="keys[key.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>

              <!-- 空白行补齐：使方向键与主键盘区 Shift / Ctrl 行对齐 -->
              <div v-for="n in (3 - layout.navigationArea.length)" :key="`nav-spacer-${n}`" class="spacer-row"></div>

              <!-- 方向键区域 -->
              <div class="arrow-keys">
                <!-- 上方向键 -->
                <div class="arrow-row-up">
                  <KeyButton :key-def="layout.arrowKeys.up" :key-health="keys[layout.arrowKeys.up.code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.up.code)" />
                </div>
                <!-- 左、下、右方向键 -->
                <div class="arrow-row-bottom">
                  <KeyButton :key-def="layout.arrowKeys.left" :key-health="keys[layout.arrowKeys.left.code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.left.code)" />
                  <KeyButton :key-def="layout.arrowKeys.down" :key-health="keys[layout.arrowKeys.down.code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.down.code)" />
                  <KeyButton :key-def="layout.arrowKeys.right" :key-health="keys[layout.arrowKeys.right.code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.right.code)" />
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：数字小键盘区域（仅 104/98 布局） -->
          <div v-if="layout.hasNumpad" class="numpad-section">
            <!-- 顶部行：98 为 Home/End/PgUp/PgDn（数字区正上方，与 F1-F12 同行）；104 为空占位 -->
            <div class="function-row">
              <div v-if="!layout.showNavSection" class="key-group">
                <KeyButton v-for="key in layout.navigationFunctionRow" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>
            </div>

            <!-- 小键盘主体区域 -->
            <div class="numpad-body">
              <!-- 第一行: Num / * - -->
              <div class="key-row">
                <KeyButton v-for="key in layout.numpadFunctionRow" :key="key.code" :key-def="key"
                  :key-health="keys[key.code]" :is-edit-mode="isEditMode" @click="emit('keyClick', key.code)" />
              </div>

              <!-- 使用 CSS Grid 布局数字区 -->
              <div class="numpad-grid">
                <!-- 第1行: 7 8 9 -->
                <div class="numpad-cell" style="grid-area: r1c1;">
                  <KeyButton :key-def="layout.numpadArea.row1[0]" :key-health="keys[layout.numpadArea.row1[0].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row1[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r1c2;">
                  <KeyButton :key-def="layout.numpadArea.row1[1]" :key-health="keys[layout.numpadArea.row1[1].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row1[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r1c3;">
                  <KeyButton :key-def="layout.numpadArea.row1[2]" :key-health="keys[layout.numpadArea.row1[2].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row1[2].code)" />
                </div>
                <!-- + 键跨2行 -->
                <div class="numpad-cell numpad-tall" style="grid-area: plus;">
                  <KeyButton :key-def="layout.numpadArea.plus" :key-health="keys[layout.numpadArea.plus.code]"
                    :is-edit-mode="isEditMode" :is-tall="true" @click="emit('keyClick', layout.numpadArea.plus.code)" />
                </div>

                <!-- 第2行: 4 5 6 -->
                <div class="numpad-cell" style="grid-area: r2c1;">
                  <KeyButton :key-def="layout.numpadArea.row2[0]" :key-health="keys[layout.numpadArea.row2[0].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row2[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r2c2;">
                  <KeyButton :key-def="layout.numpadArea.row2[1]" :key-health="keys[layout.numpadArea.row2[1].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row2[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r2c3;">
                  <KeyButton :key-def="layout.numpadArea.row2[2]" :key-health="keys[layout.numpadArea.row2[2].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row2[2].code)" />
                </div>

                <!-- 第3行: 1 2 3 -->
                <div class="numpad-cell" style="grid-area: r3c1;">
                  <KeyButton :key-def="layout.numpadArea.row3[0]" :key-health="keys[layout.numpadArea.row3[0].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row3[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r3c2;">
                  <KeyButton :key-def="layout.numpadArea.row3[1]" :key-health="keys[layout.numpadArea.row3[1].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row3[1].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: r3c3;">
                  <KeyButton :key-def="layout.numpadArea.row3[2]" :key-health="keys[layout.numpadArea.row3[2].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row3[2].code)" />
                </div>
                <!-- Enter 键跨2行 -->
                <div class="numpad-cell numpad-tall" style="grid-area: enter;">
                  <KeyButton :key-def="layout.numpadArea.enter" :key-health="keys[layout.numpadArea.enter.code]"
                    :is-edit-mode="isEditMode" :is-tall="true"
                    @click="emit('keyClick', layout.numpadArea.enter.code)" />
                </div>

                <!-- 第4行: 0 (跨2列) . -->
                <div class="numpad-cell numpad-wide" style="grid-area: zero;">
                  <KeyButton :key-def="layout.numpadArea.row4[0]" :key-health="keys[layout.numpadArea.row4[0].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row4[0].code)" />
                </div>
                <div class="numpad-cell" style="grid-area: dot;">
                  <KeyButton :key-def="layout.numpadArea.row4[1]" :key-health="keys[layout.numpadArea.row4[1].code]"
                    :is-edit-mode="isEditMode" @click="emit('keyClick', layout.numpadArea.row4[1].code)" />
                </div>
              </div>
            </div>

            <!-- 98 布局：方向键嵌入数字区左下凹槽（→ 位于数字 1 正下方空位） -->
            <div v-if="!layout.showNavSection" class="arrow-cluster">
              <div class="arrow-row-up">
                <KeyButton :key-def="layout.arrowKeys.up" :key-health="keys[layout.arrowKeys.up.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.up.code)" />
              </div>
              <div class="arrow-row-bottom">
                <KeyButton :key-def="layout.arrowKeys.left" :key-health="keys[layout.arrowKeys.left.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.left.code)" />
                <KeyButton :key-def="layout.arrowKeys.down" :key-health="keys[layout.arrowKeys.down.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.down.code)" />
                <KeyButton :key-def="layout.arrowKeys.right" :key-health="keys[layout.arrowKeys.right.code]"
                  :is-edit-mode="isEditMode" @click="emit('keyClick', layout.arrowKeys.right.code)" />
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

/* 测试模式：隐藏已记录的损坏/更换状态颜色，让按键按下反馈更清晰（按下中的键保留高亮） */
.keyboard-testing.keyboard-test-hide-status :deep(.key-button.key-damaged:not(.key-test-pressed)),
.keyboard-testing.keyboard-test-hide-status :deep(.key-button.key-replaced:not(.key-test-pressed)) {
  background: var(--key-bg);
  color: var(--key-text);
  box-shadow: var(--key-shadow);
}

/* 测试模式：同时隐藏损坏次数徽标 */
.keyboard-testing.keyboard-test-hide-status :deep(.damage-count-badge) {
  display: none;
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
}

/* 主键盘区与导航区之间的间距 */
.main-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--key-size) * 0.4);
  margin-right: calc(var(--key-size) * 0.5);
}

/* 导航区与数字区之间的间距（默认 0.5 键宽） */
.nav-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--key-size) * 0.4);
  margin-right: calc(var(--key-size) * 0.5);
}

/* 98 紧凑配列：主键盘区与数字区之间留 40px（= 键宽 - 键距），
   配合方向键簇的偏移，使 ←↓→ 与右侧数字区 0、↑ 与数字 1 均保持 4px 键距 */
.layout-98 .main-section {
  margin-right: calc(var(--key-size) - var(--key-gap));
}

/* 98：数字区作为方向键簇的定位上下文 */
.layout-98 .numpad-section {
  position: relative;
}

/* 98：方向键嵌入主区与数字区之间的凹槽。
   left = -2 键宽 - 2 键距（= -96px），使得：
   - ← 与右 Ctrl 右缘保持 4px 键距；
   - ↑ 与右 Shift 右缘、数字 1 左缘均保持 4px 键距；
   - → 位于数字 1 正下方、与数字 0 保持 4px 键距。
   任意两个键位均不重叠，符合实体 98 配列视觉。 */
.layout-98 .arrow-cluster {
  position: absolute;
  left: calc(-2 * var(--key-size) - 2 * var(--key-gap));
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--key-gap);
}

/* 98：收窄 F 键组间隔，使功能行与数字行等宽、数字区更贴近主键盘区 */
.layout-98 .function-spacer-large {
  width: 24px;
}

.layout-98 .function-spacer-small {
  width: 16px;
}

/* 87 无数字区：导航区为最后一列，去掉多余右边距 */
.layout-87 .nav-section {
  margin-right: 0;
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

/* 98 布局：数字区 0 键为单宽并右移一格（0、. 从第 1、2 列移到第 2、3 列），
   使数字 1 正下方（第 1 列底部）空出，与主键盘区底部的收窄区域共同形成方向键嵌入的凹槽 */
.layout-98 .numpad-grid {
  grid-template-areas:
    "r1c1 r1c2 r1c3 plus"
    "r2c1 r2c2 r2c3 plus"
    "r3c1 r3c2 r3c3 enter"
    "...  zero dot  enter";
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
