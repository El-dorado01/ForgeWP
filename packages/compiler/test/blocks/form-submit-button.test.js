import { describe, expect, it } from 'vitest';
import { WpFormSubmitButton } from '../../../react/src/components/WpFormSubmitButton.tsx';

describe('WpFormSubmitButton', () => {
  it('renders its decorative icon by default and always submits the form', () => {
    const button = WpFormSubmitButton({
      children: 'Send message',
      icon: 'arrow',
    });

    expect(button.type).toBe('button');
    expect(button.props.type).toBe('submit');
    expect(button.props.disabled).toBe(false);
    expect(button.props.children[0]).toBe('Send message');
    expect(button.props.children[1].props).toMatchObject({
      'aria-hidden': 'true',
      children: 'arrow',
    });
  });

  it('hides the icon and disables submission while pending', () => {
    const button = WpFormSubmitButton({
      children: 'Sending',
      icon: 'arrow',
      pending: true,
    });

    expect(button.props.disabled).toBe(true);
    expect(button.props['aria-busy']).toBe(true);
    expect(button.props.children[1]).toBe(false);
  });

  it('can hide the icon without changing the submit label', () => {
    const button = WpFormSubmitButton({
      children: 'Send message',
      icon: 'arrow',
      showIcon: false,
    });

    expect(button.props.children[0]).toBe('Send message');
    expect(button.props.children[1]).toBe(false);
  });
});
