#!/bin/bash
# R1-P1a Task 6: Install shadcn/ui components
# Run this in GitHub Codespaces after the schema/auth/actions are in place.

set -e

echo "Installing shadcn/ui components..."

pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add sonner
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add sheet
pnpm dlx shadcn@latest add alert-dialog
pnpm dlx shadcn@latest add tooltip

echo "Generating Prisma client..."
npx prisma generate

echo "Done! Run 'npx tsc --noEmit' to verify."
