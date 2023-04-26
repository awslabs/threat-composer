import type { Meta, StoryObj } from '@storybook/react';
import ThreatStatementGenerator from '.';

const meta: Meta<typeof ThreatStatementGenerator> = {
  title: 'ThreatStatementGenerator',
  component: ThreatStatementGenerator,
};

export default meta;
type Story = StoryObj<typeof ThreatStatementGenerator>;

export const Default: Story = {};
