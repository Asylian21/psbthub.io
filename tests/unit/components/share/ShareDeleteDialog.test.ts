import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import ShareDeleteDialog from '../../../../src/components/share/ShareDeleteDialog.vue'

const DialogStub = defineComponent({
  name: 'Dialog',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    closable: {
      type: Boolean,
      default: true,
    },
    dismissableMask: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:visible'],
  template: '<section v-if="visible"><slot /><slot name="footer" /></section>',
})

const ButtonStub = defineComponent({
  name: 'Button',
  props: {
    label: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
})

describe('ShareDeleteDialog', () => {
  it('emits visibility updates and confirm action', async () => {
    const wrapper = shallowMount(ShareDeleteDialog, {
      props: {
        visible: true,
        isDeleteInProgress: false,
      },
      global: {
        stubs: {
          Dialog: DialogStub,
          Button: ButtonStub,
        },
      },
    })

    wrapper.findComponent({ name: 'Dialog' }).vm.$emit('update:visible', true)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([true])

    const buttons = wrapper.findAll('button')
    const cancelButton = buttons.find((buttonWrapper) => buttonWrapper.text() === 'Cancel')
    const confirmButton = buttons.find((buttonWrapper) => buttonWrapper.text() === 'Yes, delete now')

    expect(cancelButton).toBeDefined()
    expect(confirmButton).toBeDefined()

    await cancelButton?.trigger('click')
    await confirmButton?.trigger('click')

    expect(wrapper.emitted('update:visible')?.[1]).toEqual([false])
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('locks dialog dismissal while deletion is in progress', () => {
    const wrapper = shallowMount(ShareDeleteDialog, {
      props: {
        visible: true,
        isDeleteInProgress: true,
      },
      global: {
        stubs: {
          Dialog: DialogStub,
          Button: ButtonStub,
        },
      },
    })

    const dialog = wrapper.findComponent({ name: 'Dialog' })
    expect(dialog.props('closable')).toBe(false)
    expect(dialog.props('dismissableMask')).toBe(false)
  })
})
