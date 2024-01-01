import type {Meta, StoryObj} from '@storybook/react';

import {AADSignInOutButton} from '../components/AADSignInOutButton';

const meta = {
  title: 'Buttons/AADSignInOutButton',
  component: AADSignInOutButton,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs']
} satisfies Meta<typeof AADSignInOutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const SignIn: Story = {
  args: {
    isAuthenticated: false
  },
};

export const SignOut: Story = {
  args: {
    isAuthenticated: false
  },
};
