import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import SharePasswordGate from '../../../../src/components/share/SharePasswordGate.vue'

const PasswordStub = defineComponent({
  name: 'Password',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:model-value', 'keyup.enter'],
  template: '<input :value="modelValue" />',
})

const ButtonStub = defineComponent({
  name: 'Button',
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

describe('SharePasswordGate', () => {
  it('emits password updates and decrypt request', async () => {
    const wrapper = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: 'Jan 01',
        createdAtUtcDisplay: 'Jan 01 UTC',
        passwordInput: '',
        passwordPromptMessage: 'Enter password',
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: true,
        },
      },
    })

    wrapper.findComponent({ name: 'Password' }).vm.$emit('update:model-value', 'StrongPass#1')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:passwordInput')?.[0]).toEqual(['StrongPass#1'])

    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('decrypt')).toHaveLength(1)
  })

  it('does not emit decrypt when cooldown is active', async () => {
    const wrapper = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: '',
        createdAtUtcDisplay: '',
        passwordInput: 'somepass',
        passwordPromptMessage: '',
        decryptCooldownSeconds: 3,
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: true,
        },
      },
    })

    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('decrypt')).toBeUndefined()
  })

  it('shows cooldown message when decryptCooldownSeconds > 0', () => {
    const wrapper = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: '',
        createdAtUtcDisplay: '',
        passwordInput: '',
        passwordPromptMessage: 'Password is incorrect.',
        decryptCooldownSeconds: 4,
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Try again in 4s')
    expect(wrapper.text()).not.toContain('Password is incorrect.')
  })

  it('shows error message when no cooldown is active', () => {
    const wrapper = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: '',
        createdAtUtcDisplay: '',
        passwordInput: '',
        passwordPromptMessage: 'Password is incorrect.',
        decryptCooldownSeconds: 0,
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Password is incorrect.')
  })

  it('renders created-at info only when timestamp exists', () => {
    const withTimestamp = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: 'Jan 01',
        createdAtUtcDisplay: 'Jan 01 UTC',
        passwordInput: 'abc',
        passwordPromptMessage: 'Prompt',
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: defineComponent({
            name: 'ShareCreatedAtInfo',
            template: '<div data-testid="created-at-info" />',
          }),
        },
      },
    })

    expect(withTimestamp.find('[data-testid="created-at-info"]').exists()).toBe(true)

    const withoutTimestamp = shallowMount(SharePasswordGate, {
      props: {
        createdAtDisplay: '',
        createdAtUtcDisplay: '',
        passwordInput: 'abc',
        passwordPromptMessage: 'Prompt',
      },
      global: {
        stubs: {
          Password: PasswordStub,
          Button: ButtonStub,
          ShareCreatedAtInfo: defineComponent({
            name: 'ShareCreatedAtInfo',
            template: '<div data-testid="created-at-info" />',
          }),
        },
      },
    })

    expect(withoutTimestamp.find('[data-testid="created-at-info"]').exists()).toBe(false)
  })
})
