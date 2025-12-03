export class ContextMenu {
  constructor(options = {}) {
    this.items = [];
    this.x = 0;
    this.y = 0;
    this.onSelect = options.onSelect || null;
  }

  addItem(label, icon, action, disabled = false) {
    this.items.push({ label, icon, action, disabled });
    return this;
  }

  addDivider() {
    this.items.push({ divider: true });
    return this;
  }

  show(x, y) {
    this.x = x;
    this.y = y;
    this.render();
  }

  render() {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = this.x + 'px';
    menu.style.top = this.y + 'px';

    this.items.forEach((item, idx) => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menu.appendChild(divider);
      } else {
        const el = document.createElement('div');
        el.className = 'context-menu-item';
        if (item.disabled) el.classList.add('disabled');
        el.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
        el.onclick = () => {
          if (!item.disabled && item.action) {
            item.action();
            this.hide();
          }
        };
        menu.appendChild(el);
      }
    });

    document.getElementById('contextMenuContainer')?.remove();
    menu.id = 'contextMenuContainer';
    document.body.appendChild(menu);
  }

  hide() {
    document.getElementById('contextMenuContainer')?.remove();
  }

  static addStyles() {
    if (document.getElementById('contextMenuStyles')) return;
    const style = document.createElement('style');
    style.id = 'contextMenuStyles';
    style.textContent = `
      .context-menu {
        position: fixed;
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        z-index: 10000;
        min-width: 180px;
      }
      .context-menu-item {
        padding: 8px 12px;
        color: #d4d4d4;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .context-menu-item:hover:not(.disabled) {
        background: #3c3c3c;
      }
      .context-menu-item.disabled {
        color: #666;
        cursor: not-allowed;
      }
      .context-menu-divider {
        height: 1px;
        background: #3c3c3c;
      }
    `;
    document.head.appendChild(style);
  }
}

export function createAppContextMenu() {
  ContextMenu.addStyles();
  return new ContextMenu();
}