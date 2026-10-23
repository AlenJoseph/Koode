/** Landing-aligned badge labels for content pathway slugs. */
export function pathwayBadge(slug: string | null | undefined): { label: string; className: string } {
  switch (slug) {
    case 'know-yourself':
      return { label: 'Self', className: 'badge self' };
    case 'think-it-through':
      return { label: 'Mind', className: 'badge mind' };
    case 'body-and-care':
      return { label: 'Health', className: 'badge health' };
    case 'money-sense':
      return { label: 'Money', className: 'badge money' };
    case 'civic-life':
      return { label: 'Civic', className: 'badge civic' };
    case 'living-world':
      return { label: 'Nature', className: 'badge nature' };
    default:
      return { label: 'Path', className: 'badge' };
  }
}
