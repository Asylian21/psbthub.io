import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import HomeSecurityStep from '../../../../src/components/home/HomeSecurityStep.vue'
import { HOME_SHARE_SECURITY_MODE_OPTIONS } from '../../../../src/content/homeContent'

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

const PasswordStub = defineComponent({
  name: 'Password',
  emits: ['update:model-value'],
  template: '<input />',
})

const CheckboxStub = defineComponent({
  name: 'Checkbox',
  emits: ['update:model-value'],
  template: '<input type="checkbox" />',
})

const ProgressBarStub = defineComponent({
  name: 'ProgressBar',
  template: '<div />',
})

const TagStub = defineComponent({
  name: 'Tag',
  template: '<span><slot /></span>',
})

const MessageStub = defineComponent({
  name: 'Message',
  template: '<div><slot /></div>',
})

function createBaseProps() {
  return {
    isExpanded: true,
    selectedShareSecurityMode: HOME_SHARE_SECURITY_MODE_OPTIONS[0]!.value,
    shareSecurityModeOptions: HOME_SHARE_SECURITY_MODE_OPTIONS,
    selectedShareSecurityOption: HOME_SHARE_SECURITY_MODE_OPTIONS[0]!,
    isPasswordSecurityMode: true,
    sharePasswordInput: 'CurrentPassword#123',
    hasAcknowledgedFragmentModeRisk: false,
    isUploading: false,
    sharePasswordStrengthScore: 87,
    sharePasswordStrengthDisplay: 'Strong (87/100)',
    sharePasswordStrengthGuidance: 'Looks good',
    sharePasswordStrengthClass: 'meter-strong',
    sharePasswordSignalItems: [
      { id: 'length', label: 'Length 12+', passed: true },
      { id: 'mixed-case', label: 'Mixed upper/lowercase', passed: true },
    ],
    sharePasswordValidationMessage: '',
    handleStepCollapseBeforeEnter: () => {},
    handleStepCollapseEnter: () => {},
    handleStepCollapseAfterEnter: () => {},
    handleStepCollapseBeforeLeave: () => {},
    handleStepCollapseLeave: () => {},
    handleStepCollapseAfterLeave: () => {},
  }
}

describe('HomeSecurityStep', () => {
  it('emits selected mode changes when security card is clicked', async () => {
    const wrapper = shallowMount(HomeSecurityStep, {
      props: createBaseProps(),
      global: {
        stubs: {
          Button: ButtonStub,
          Checkbox: CheckboxStub,
          Message: MessageStub,
          Password: PasswordStub,
          ProgressBar: ProgressBarStub,
          Tag: TagStub,
        },
      },
    })

    const oneLinkCard = wrapper
      .findAll('button.security-mode-card')
      .find((card) => card.text().includes('One-link handoff'))
    expect(oneLinkCard).toBeDefined()

    await oneLinkCard?.trigger('click')

    expect(wrapper.emitted('update:selectedShareSecurityMode')).toBeTruthy()
    const emittedValues = wrapper.emitted('update:selectedShareSecurityMode') ?? []
    expect(emittedValues[0]?.[0]).toBe('link_fragment')
  })

  it('emits password actions in password mode', async () => {
    const wrapper = shallowMount(HomeSecurityStep, {
      props: createBaseProps(),
      global: {
        stubs: {
          Button: ButtonStub,
          Checkbox: CheckboxStub,
          Message: MessageStub,
          Password: PasswordStub,
          ProgressBar: ProgressBarStub,
          Tag: TagStub,
        },
      },
    })

    wrapper.findComponent({ name: 'Password' }).vm.$emit('update:model-value', 'NewPass#456')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:sharePasswordInput')?.[0]).toEqual(['NewPass#456'])

    const actionButtons = wrapper.findAll('button')
    const generateButton = actionButtons.find(
      (buttonWrapper) => buttonWrapper.text() === 'Generate secure password',
    )
    const clearButton = actionButtons.find(
      (buttonWrapper) => buttonWrapper.text() === 'Clear password',
    )

    expect(generateButton).toBeDefined()
    expect(clearButton).toBeDefined()

    await generateButton?.trigger('click')
    await clearButton?.trigger('click')

    expect(wrapper.emitted('generate-password')).toHaveLength(1)
    expect(wrapper.emitted('clear-password')).toHaveLength(1)
  })

  it('emits fragment risk acknowledgement updates in one-link mode', async () => {
    const fragmentOption = HOME_SHARE_SECURITY_MODE_OPTIONS.find(
      (option) => option.value === 'link_fragment',
    )
    if (!fragmentOption) {
      throw new Error('Expected link_fragment mode option to exist')
    }

    const wrapper = shallowMount(HomeSecurityStep, {
      props: {
        ...createBaseProps(),
        selectedShareSecurityMode: 'link_fragment',
        selectedShareSecurityOption: fragmentOption,
        isPasswordSecurityMode: false,
        sharePasswordInput: '',
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Checkbox: CheckboxStub,
          Message: MessageStub,
          Password: PasswordStub,
          ProgressBar: ProgressBarStub,
          Tag: TagStub,
        },
      },
    })

    wrapper.findComponent({ name: 'Checkbox' }).vm.$emit('update:model-value', true)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:hasAcknowledgedFragmentModeRisk')?.[0]).toEqual([true])
  })
})
