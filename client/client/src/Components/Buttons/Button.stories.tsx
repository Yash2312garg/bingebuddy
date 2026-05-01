import type { Meta, StoryObj } from "@storybook/react";
import Btn from "./Button";

const meta: Meta<typeof Btn> = {
  title: "UI/Button",
  component: Btn,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["Primary", "Secondary", "Tertiary"],
    },
    size: {
      control: "select",
      options: ["Small", "Medium", "Large"],
    },
    disabled: {
      control: "boolean",
    },
    children: {
      control: "text",
    },
    onClick: {
      action: "clicked",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Btn>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "Primary",
    size: "Large",
    disabled: false,
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "Secondary",
    size: "Medium",
  },
};

export const Tertiary: Story = {
  args: {
    children: "Tertiary Button",
    variant: "Tertiary",
    size: "Small",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    variant: "Primary",
    size: "Large",
    disabled: true,
  },
};

/**
 * Showcase all variants together
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Btn variant="Primary">Primary</Btn>
      <Btn variant="Secondary">Secondary</Btn>
      <Btn variant="Tertiary">Tertiary</Btn>
    </div>
  ),
};
