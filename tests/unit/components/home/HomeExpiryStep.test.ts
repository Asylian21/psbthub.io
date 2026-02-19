import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import HomeExpiryStep from '../../../../src/components/home/HomeExpiryStep.vue'

const ButtonStub = defineComponent({
  name: 'Button',
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  template:
    '<button type="button" @click="$emit(\'click\')"><slot />{{ label }}</button>',
})

const DatePickerStub = defineComponent({
  name: 'DatePicker',
  emits: ['update:model-value'],
  template: '<input />',
})

const TagStub = defineComponent({
  name: 'Tag',
  template: '<span><slot /></span>',
})

function createBaseProps() {
  const now = new Date('2026-02-16T12:00:00.000Z')
  const max = new Date('2026-03-19T12:00:00.000Z')

  return {
    isExpanded: true,
    isUploading: false,
    isShareExpiryValid: true,
    shareExpiryPickerDate: now,
    shareExpiryPickerMinDate: now,
    shareExpiryPickerMaxDate: max,
    shareExpiryPickerDateFormat: 'yy-mm-dd',
    shareExpiryTagPt: {},
    shareExpiryDisplayMode: 'local' as const,
    shareExpiryLocalDisplay: 'Feb 16, 2026, 12:00:00',
    shareExpiryUtcDisplay: 'Feb 16, 2026, 12:00:00 UTC',
    shareExpiryPickerModeHint: 'Picker editing mode: local timezone',
    shareExpiryValidationMessage: '',
    shareExpiryLabelMaxDays: '31 days',
    showShareExpiryCountdown: true,
    shareExpiryCountdownPresentation: {
      title: 'Auto-delete preview countdown',
      helper: 'Preview only',
      phaseLabel: 'Not uploaded yet',
      phaseModifier: 'preview' as const,
      liveDotModifier: 'preview' as const,
    },
    shareExpiryCountdownStatus: {
      label: 'Deletion scheduled',
      modifier: 'safe' as const,
    },
    shareExpiryDeletionScheduleLabel: 'Feb 16, 2026, 12:00:00',
    shareExpiryCountdownUnits: [
      { id: 'days' as const, value: '10', label: 'Days' },
      { id: 'hours' as const, value: '08', label: 'Hours' },
      { id: 'minutes' as const, value: '30', label: 'Minutes' },
      { id: 'seconds' as const, value: '15', label: 'Seconds' },
    ],
    handleStepCollapseBeforeEnter: () => {},
    handleStepCollapseEnter: () => {},
    handleStepCollapseAfterEnter: () => {},
    handleStepCollapseBeforeLeave: () => {},
    handleStepCollapseLeave: () => {},
    handleStepCollapseAfterLeave: () => {},
  }
}

describe('HomeExpiryStep', () => {
  it('emits picker updates only for valid date payloads', async () => {
    const wrapper = shallowMount(HomeExpiryStep, {
      props: createBaseProps(),
      global: {
        stubs: {
          Button: ButtonStub,
          DatePicker: DatePickerStub,
          Tag: TagStub,
        },
      },
    })

    const validDate = new Date('2026-02-18T14:30:00.000Z')
    wrapper.findComponent({ name: 'DatePicker' }).vm.$emit('update:model-value', validDate)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:shareExpiryPickerDate')?.[0]).toEqual([validDate])

    wrapper.findComponent({ name: 'DatePicker' }).vm.$emit('update:model-value', [validDate])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:shareExpiryPickerDate')).toHaveLength(1)
  })

  it('emits timezone mode updates from local/utc controls', async () => {
    const wrapper = shallowMount(HomeExpiryStep, {
      props: createBaseProps(),
      global: {
        stubs: {
          Button: ButtonStub,
          DatePicker: DatePickerStub,
          Tag: TagStub,
        },
      },
    })

    const localButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes('Local time'))
    const utcButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes('UTC reference'))

    expect(localButton).toBeDefined()
    expect(utcButton).toBeDefined()

    await localButton?.trigger('click')
    await utcButton?.trigger('click')

    expect(wrapper.emitted('update:shareExpiryDisplayMode')?.[0]).toEqual(['local'])
    expect(wrapper.emitted('update:shareExpiryDisplayMode')?.[1]).toEqual(['utc'])
  })

  it('renders countdown details when countdown is enabled', () => {
    const wrapper = shallowMount(HomeExpiryStep, {
      props: createBaseProps(),
      global: {
        stubs: {
          Button: ButtonStub,
          DatePicker: DatePickerStub,
          Tag: TagStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Auto-delete preview countdown')
    expect(wrapper.text()).toContain('Scheduled deletion:')
    expect(wrapper.text()).toContain('Deletion scheduled')
  })
})
