import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import ShareLifecycleCard from '../../../../src/components/share/ShareLifecycleCard.vue'

const CardStub = defineComponent({
  name: 'Card',
  template: '<section><slot name="content" /></section>',
})

const TagStub = defineComponent({
  name: 'Tag',
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  template: '<span class="tag-stub">{{ value }}</span>',
})

const MessageStub = defineComponent({
  name: 'Message',
  template: '<div class="message-stub"><slot /></div>',
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

function createBaseProps() {
  return {
    lifecycleStatusTag: {
      severity: 'warn' as const,
      value: 'Less than 1 hour',
    },
    lifecycleSummaryText: 'Payload is still available.',
    shouldShowLifecycleCountdown: true,
    lifecycleCountdownStatus: 'warning' as const,
    lifecycleCountdownUnits: [
      { key: 'days' as const, label: 'Days', value: '00' },
      { key: 'hours' as const, label: 'Hours', value: '00' },
      { key: 'minutes' as const, label: 'Minutes', value: '59' },
      { key: 'seconds' as const, label: 'Seconds', value: '58' },
    ],
    expiresAtDisplay: 'Feb 16, 2026 12:00 PM',
    expiresAtUtcDisplay: 'Feb 16, 2026 12:00 PM UTC',
    deleteFeedback: null,
    manualDeleteButtonLabel: 'Delete share now',
    isDeleteInProgress: false,
    isManualDeleteDisabled: false,
    isShareManuallyDeleted: false,
  }
}

describe('ShareLifecycleCard', () => {
  it('renders lifecycle countdown and schedule metadata', () => {
    const wrapper = shallowMount(ShareLifecycleCard, {
      props: createBaseProps(),
      global: {
        stubs: {
          Card: CardStub,
          Message: MessageStub,
          Tag: TagStub,
          Button: ButtonStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Share lifecycle control')
    expect(wrapper.text()).toContain('Less than 1 hour')
    expect(wrapper.text()).toContain('59')
    expect(wrapper.text()).toContain('Scheduled deletion Feb 16, 2026 12:00 PM')
  })

  it('emits manual delete request when delete button is clicked', async () => {
    const wrapper = shallowMount(ShareLifecycleCard, {
      props: createBaseProps(),
      global: {
        stubs: {
          Card: CardStub,
          Message: MessageStub,
          Tag: TagStub,
          Button: ButtonStub,
        },
      },
    })

    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('request-manual-delete')).toHaveLength(1)
  })

  it('displays delete feedback message content', () => {
    const wrapper = shallowMount(ShareLifecycleCard, {
      props: {
        ...createBaseProps(),
        deleteFeedback: {
          severity: 'success' as const,
          title: 'Share deleted from server',
          detail: 'Refresh now shows unavailable state.',
        },
      },
      global: {
        stubs: {
          Card: CardStub,
          Message: MessageStub,
          Tag: TagStub,
          Button: ButtonStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Share deleted from server')
    expect(wrapper.text()).toContain('Refresh now shows unavailable state.')
  })
})
