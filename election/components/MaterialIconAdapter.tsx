import { useEffect } from 'react';

const directMap: Record<string, string> = {
  'fa-print': 'print',
  'fa-edit': 'edit',
  'fa-trash': 'delete',
  'fa-trash-can': 'delete',
  'fa-copy': 'content_copy',
  'fa-user-plus': 'person_add',
  'fa-user-pen': 'edit',
  'fa-id-card-clip': 'badge',
  'fa-magnifying-glass': 'search',
  'fa-users-slash': 'group_off',
  'fa-flag': 'flag',
  'fa-flag-checkered': 'outlined_flag',
  'fa-circle-notch': 'progress_activity',
  'fa-spinner': 'progress_activity',
  'fa-xmark': 'close',
  'fa-plus': 'add',
  'fa-check': 'check',
  'fa-check-double': 'done_all',
  'fa-circle-check': 'check_circle',
  'fa-circle-info': 'info',
  'fa-circle-question': 'help',
  'fa-circle-xmark': 'cancel',
  'fa-circle-exclamation': 'error',
  'fa-triangle-exclamation': 'warning',
  'fa-comment-dots': 'chat',
  'fa-square-poll-vertical': 'poll',
  'fa-check-to-slot': 'how_to_vote',
  'fa-server': 'dns',
  'fa-satellite-dish': 'satellite_alt',
  'fa-shield-halved': 'shield',
  'fa-users-viewfinder': 'group',
  'fa-chart-line': 'show_chart',
  'fa-graduation-cap': 'school',
  'fa-user-tie': 'person',
  'fa-venus-mars': 'wc',
  'fa-file-pdf': 'picture_as_pdf',
  'fa-layer-group': 'layers',
  'fa-pen-to-square': 'edit_square',
  'fa-rotate': 'refresh',
  'fa-eye': 'visibility',
  'fa-eye-slash': 'visibility_off',
  'fa-file-zipper': 'folder_zip',
  'fa-file-shield': 'security',
  'fa-download': 'download',
  'fa-image': 'image',
  'fa-share-nodes': 'share',
  'fa-building-columns': 'account_balance',
  'fa-school': 'school',
  'fa-file-lines': 'description',
  'fa-chart-area': 'area_chart',
  'fa-chart-pie': 'pie_chart',
  'fa-database': 'database',
  'fa-door-open': 'logout',
  'fa-file-export': 'ios_share',
  'fa-file-image': 'image',
  'fa-shield-check': 'verified_user',
  'fa-skull-crossbones': 'warning',
  'fa-sliders': 'tune',
  'fa-user-xmark': 'person_off',
  'fa-calendar-check': 'event_available',
  'fa-clock-rotate-left': 'history',
  'fa-lock': 'lock',
  'fa-lock-open': 'lock_open',
  'fa-timeline': 'timeline',
  'fa-clock': 'schedule',
  'fa-user-check': 'how_to_reg',
  'fa-user-slash': 'person_off',
  'fa-box-open': 'inventory_2',
  'fa-folder': 'folder',
  'fa-folder-open': 'folder_open',
  'fa-folder-closed': 'folder',
  'fa-genderless': 'person',
  'fa-magnifying-glass-chart': 'monitoring',
  'fa-mars': 'male',
  'fa-people-group': 'groups',
  'fa-venus': 'female',
  'fa-paper-plane': 'send',
  'fa-robot': 'smart_toy',
  'fa-flask-vial': 'science',
  'fa-list-check': 'checklist',
  'fa-power-off': 'power_settings_new',
  'fa-right-from-bracket': 'logout',
  'fa-fingerprint': 'fingerprint',
  'fa-star': 'star',
  'fa-arrow-left': 'arrow_back',
  'fa-arrow-right-long': 'arrow_forward',
  'fa-cloud-slash': 'cloud_off',
  'fa-mobile-screen': 'smartphone',
  'fa-camera': 'photo_camera',
  'fa-envelope': 'mail',
  'fa-phone': 'call',
  'fa-file-signature': 'draw',
  'fa-ban': 'block',
  'fa-bolt-lightning': 'bolt',
};

const hasFaClass = (cls: string) =>
  cls === 'fa-solid' || cls.startsWith('fa-');

const resolveMaterialName = (classes: string[]) => {
  const faClass = classes.find((c) => c.startsWith('fa-') && c !== 'fa-solid');
  if (!faClass) return null;
  if (directMap[faClass]) return directMap[faClass];
  if (faClass.startsWith('fa-chevron-')) return faClass.endsWith('up') ? 'expand_less' : 'expand_more';
  if (faClass.startsWith('fa-angle-')) return faClass.endsWith('up') ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  return null;
};

const convertFontAwesomeNodes = (root: ParentNode) => {
  const nodes = root.querySelectorAll('i.fa-solid, i[class*="fa-"]');
  nodes.forEach((node) => {
    const classList = Array.from(node.classList);
    const iconName = resolveMaterialName(classList);
    if (!iconName) return;

    const passthrough = classList.filter((c) => !hasFaClass(c));
    const replacement = document.createElement('span');
    replacement.className = ['material-symbols-outlined', ...passthrough].join(' ').trim();
    replacement.textContent = iconName;
    replacement.setAttribute('aria-hidden', 'true');
    (replacement.style as any).fontSize = (node as HTMLElement).style.fontSize || '18px';
    node.replaceWith(replacement);
  });
};

export default function MaterialIconAdapter() {
  useEffect(() => {
    convertFontAwesomeNodes(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((added) => {
          if (!(added instanceof HTMLElement)) return;
          convertFontAwesomeNodes(added);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

