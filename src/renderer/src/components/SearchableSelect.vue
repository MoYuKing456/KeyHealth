<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

/**
 * 可搜索下拉选择组件：
 * - 输入框内直接输入即进行模糊搜索（同时匹配 label 与 code，支持子序列模糊）；
 * - 下拉列表动态显示匹配项，支持 ↑/↓ 选择、Enter 确认、Esc 关闭、点击外部关闭；
 * - v-model 绑定选中的 code。
 */
const props = defineProps<{
  options: { code: string; label: string }[]
  placeholder?: string
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const query = ref('')
const highlightIndex = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

// 下拉菜单的固定定位样式（跟随输入框；maxHeight 按可用空间收缩，保证完整可见）
const menuStyle = reactive<{ top: string; left: string; width: string; maxHeight: string }>({
  top: '0px',
  left: '0px',
  width: '100%',
  maxHeight: '220px'
})

// 当前选中项的标签
const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.code === props.modelValue)
  return opt ? opt.label : ''
})

/**
 * 模糊匹配打分：返回 >0 表示匹配，0 表示不匹配。
 * 优先级：前缀 > 包含 > 子序列（允许漏打字符的模糊匹配）。
 */
function fuzzyScore(q: string, text: string): number {
  const ql = q.toLowerCase()
  const tl = text.toLowerCase()
  if (!ql) return 1
  if (tl.startsWith(ql)) return 1000 - tl.length
  const idx = tl.indexOf(ql)
  if (idx >= 0) return 500 - idx
  // 子序列匹配
  let qi = 0
  for (let ti = 0; ti < tl.length && qi < ql.length; ti++) {
    if (tl[ti] === ql[qi]) qi++
  }
  return qi === ql.length ? 10 : 0
}

// 过滤 + 按匹配分排序的选项
const filteredOptions = computed(() => {
  const q = query.value.trim()
  return props.options
    .map(opt => {
      const score = Math.max(fuzzyScore(q, opt.label), fuzzyScore(q, opt.code))
      return { ...opt, score }
    })
    .filter(o => o.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
})

// 根据输入框可见包裹层定位下拉菜单（fixed，挂到 body，避免被滚动容器裁剪）。
// 下方空间不足时向上翻转，保证菜单完整可见。
const positionMenu = (): void => {
  const wrap = rootRef.value?.querySelector('.searchable-select-input-wrap') as HTMLElement | null
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  const menuH = menuRef.value?.offsetHeight || 0
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  // 优先空间足够的一侧；两边都不够时选空间更大的一侧，尽量保证菜单完整可见
  const canDown = spaceBelow >= menuH + 4
  const canUp = spaceAbove >= menuH + 4
  const down = canDown ? true : canUp ? false : spaceBelow >= spaceAbove
  menuStyle.top = down ? `${rect.bottom + 4}px` : `${rect.top - 4 - menuH}px`
  menuStyle.left = `${rect.left}px`
  menuStyle.width = `${rect.width}px`
  // 可用空间不足时收缩菜单高度，避免溢出视口
  const availH = Math.max(60, (down ? spaceBelow : spaceAbove) - 4)
  menuStyle.maxHeight = `${Math.min(220, availH)}px`
}

const open = (): void => {
  isOpen.value = true
  // 打开时若当前有选中项且尚未输入，把选中项标签填入输入框便于继续修改
  if (!query.value && props.modelValue) {
    query.value = selectedLabel.value
  }
  highlightIndex.value = 0
  // 等菜单渲染后再测量高度定位（支持向上翻转）
  nextTick(positionMenu)
}

const close = (): void => {
  isOpen.value = false
  // 未选中新项时恢复为当前选中项的标签（或清空）
  query.value = props.modelValue ? selectedLabel.value : ''
}

const selectOption = (code: string): void => {
  emit('update:modelValue', code)
  query.value = props.options.find(o => o.code === code)?.label || ''
  isOpen.value = false
}

const handleInput = (e: Event): void => {
  query.value = (e.target as HTMLInputElement).value
  isOpen.value = true
  highlightIndex.value = 0
  // 过滤后菜单高度变化，重新定位
  nextTick(positionMenu)
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!isOpen.value) {
      open()
      return
    }
    highlightIndex.value = Math.min(highlightIndex.value + 1, filteredOptions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!isOpen.value) {
      open()
      return
    }
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = filteredOptions.value[highlightIndex.value]
    if (opt) {
      selectOption(opt.code)
    } else {
      isOpen.value = false
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    isOpen.value = false
  }
}

// 点击组件外部关闭（输入框区域与下拉菜单都算组件内部）
const handleDocClick = (e: MouseEvent): void => {
  const target = e.target as Node
  if (rootRef.value?.contains(target)) return
  if (menuRef.value?.contains(target)) return
  close()
}

// 滚动/窗口尺寸变化时让下拉跟随输入框
const handleReposition = (): void => {
  if (isOpen.value) positionMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocClick, true)
  window.addEventListener('scroll', handleReposition, true)
  window.addEventListener('resize', handleReposition)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocClick, true)
  window.removeEventListener('scroll', handleReposition, true)
  window.removeEventListener('resize', handleReposition)
})

// v-model 被外部清空/修改时同步输入框显示
watch(
  () => props.modelValue,
  val => {
    if (!isOpen.value) {
      query.value = val ? props.options.find(o => o.code === val)?.label || '' : ''
    }
  }
)
</script>

<template>
  <div ref="rootRef" class="searchable-select">
    <div class="searchable-select-input-wrap" :class="{ 'is-open': isOpen }">
      <svg class="searchable-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input class="searchable-select-input" :placeholder="placeholder" :value="query" @input="handleInput"
        @focus="open" @keydown="handleKeydown" autocomplete="off" spellcheck="false" />
      <svg class="searchable-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- 挂到 body，固定定位，避免被弹窗/滚动容器裁剪 -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div v-if="isOpen" ref="menuRef" class="searchable-select-menu" :style="menuStyle">
          <div v-if="filteredOptions.length === 0" class="searchable-select-empty">无匹配项</div>
          <button v-for="(opt, idx) in filteredOptions" :key="opt.code" type="button"
            class="searchable-select-option" :class="{
              'is-highlight': idx === highlightIndex,
              'is-selected': opt.code === modelValue
            }" @mousedown.prevent="selectOption(opt.code)" @mouseenter="highlightIndex = idx">
            <span class="searchable-select-option-label">{{ opt.label }}</span>
            <span class="searchable-select-option-code">{{ opt.code }}</span>
            <svg v-if="opt.code === modelValue" class="searchable-select-check" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  width: 100%;
}

.searchable-select-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 38px;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.searchable-select-input-wrap:hover {
  border-color: var(--color-border-light);
}

.searchable-select-input-wrap.is-open {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.searchable-select-icon {
  position: absolute;
  left: 10px;
  width: 15px;
  height: 15px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.searchable-select-input {
  flex: 1;
  height: 100%;
  min-width: 0;
  padding: 0 24px 0 30px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--color-text-primary);
}

.searchable-select-input::placeholder {
  color: var(--color-text-muted);
}

.searchable-select-arrow {
  position: absolute;
  right: 10px;
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
  transition: transform 0.2s ease;
}

.searchable-select-input-wrap.is-open .searchable-select-arrow {
  transform: rotate(180deg);
}

/* 挂到 body 后为固定定位；z-index 高于弹窗遮罩(100)。四角统一圆角 */
.searchable-select-menu {
  position: fixed;
  max-height: 220px;
  overflow-y: auto;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 200;
  scrollbar-width: thin; /* Firefox 细滚动条 */
}

/* 细滚动条（圆角拇指 + 透明轨道），避免遮挡右下角圆角 */
.searchable-select-menu::-webkit-scrollbar {
  width: 6px;
}

.searchable-select-menu::-webkit-scrollbar-track {
  background: transparent;
}

.searchable-select-menu::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 3px;
}

.dark .searchable-select-menu {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.searchable-select-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
}

.searchable-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;
}

.searchable-select-option.is-highlight {
  background: var(--color-surface-hover);
}

.searchable-select-option.is-selected {
  background: var(--color-accent-light);
}

.searchable-select-option.is-selected .searchable-select-option-label {
  color: var(--color-accent);
}

.searchable-select-option-label {
  font-weight: 500;
  white-space: nowrap;
}

.searchable-select-option-code {
  font-size: 11px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.searchable-select-check {
  width: 14px;
  height: 14px;
  color: var(--color-accent);
  flex-shrink: 0;
}

/* Dropdown Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
