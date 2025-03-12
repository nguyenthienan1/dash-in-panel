/*	Dash in panel - GNOME Shell extension - Copyright @fthx 2025 */


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Dash from 'resource:///org/gnome/shell/ui/dash.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';


const DashPanel = GObject.registerClass(
class DashPanel extends Dash.Dash {
    _init(settings) {
        super._init();

        this._settings = settings;

        this.remove_child(this._dashContainer);

        this.iconSize = this._settings.get_int('icon-size');

        this.showAppsButton.track_hover = false;
        this._showAppsIcon.icon.setIconSize(this.iconSize);
        this.showAppsButton.add_style_class_name('dash-in-panel-show-apps-button');
        if (!this._settings.get_boolean('show-apps'))
            this.showAppsButton.hide();

        this._box.connectObject('child-added', (actor, item) => this._setStyle(item), this);
        this.showAppsButton.connectObject('clicked', this._onShowAppsClick.bind(this), this);
    }

    _setStyle(item) {
        if (!item?.child?._dot)
            return;

        item.child.set_style_class_name('dash-in-panel-icon');

        let margin = this._settings.get_int('button-margin');
        item.child.set_style(`margin-left: ${margin}px; margin-right: ${margin}px;`);

        let scaleFactor = global.display.get_monitor_scale(global.display.get_primary_monitor());
        item.child._dot.width = this.iconSize * scaleFactor;
        item.child._dot.height += scaleFactor;
        if (this._settings.get_boolean('colored-dot'))
            item.child._dot.add_style_class_name('dash-in-panel-icon-colored-dot');

        this._timeoutSeparator = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._separator?.add_style_class_name('dash-in-panel-separator');

                this._timeoutSeparator = null;
                return GLib.SOURCE_REMOVE;
            });

        if (this._settings.get_boolean('show-label'))
            item.label?.connectObject('notify::visible', () => {
                    this._timeoutLabel = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        if (!item?.label)
                            return;

                        const yOffset = item.label.get_theme_node().get_length('-y-offset');
                        item.label.y += 2 * item.label.height + 2 * yOffset + Main.panel.height - 32;

                        this._timeoutLabel = null;
                        return GLib.SOURCE_REMOVE;
                    });
                }, this);
    }

    _onShowAppsClick() {
        if (Main.overview.visible)
            Main.overview.dash.showAppsButton.checked = !Main.overview.dash.showAppsButton.checked;
        else
            Main.overview.showApps();
    }

    _queueRedisplay() {
        if (this._workId)
            Main.queueDeferredWork(this._workId);
    }

    _destroy() {
        if (this._timeoutSeparator) {
            GLib.Source.remove(this._timeoutSeparator);
            this._timeoutSeparator = null;
        }

        if (this._timeoutLabel) {
            GLib.Source.remove(this._timeoutLabel);
            this._timeoutLabel = null;
        }

        this._box?.disconnectObject(this);
        this.showAppsButton.disconnectObject(this);
        this._workId = null;

        super.destroy();
    }
});

const DashButton = GObject.registerClass(
class DashButton extends PanelMenu.Button {
    _init(settings) {
        super._init();

        this._settings = settings;

        this.reactive = false;

        this._timeoutDash = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._dash = new DashPanel(this._settings);
            this.add_child(this._dash._dashContainer);

            this._timeoutDash = null;
            return GLib.SOURCE_REMOVE;
        });

        this.connectObject('destroy', this._destroy.bind(this), this);
    }

    _destroy() {
        if (this._timeoutDash) {
            GLib.Source.remove(this._timeoutDash);
            this._timeoutDash = null;
        }

        this._dash?._destroy();
        super.destroy();
    }
});

export default class DashInPanelExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    _moveDate(active) {
        let panel = Main.sessionMode.panel;

        if (active) {
            panel.center = panel.center.filter(item => item !== 'dateMenu');
            panel.right.unshift('dateMenu');
        } else {
            panel.right = panel.right.filter(item => item !== 'dateMenu');
            panel.center.unshift('dateMenu');
        }

        Main.panel._updatePanel();
    }

    _restart() {
        this.disable();
        this.enable();
    }

    enable() {
        this._settings = this.getSettings();

        let scaleFactor = global.display.get_monitor_scale(global.display.get_primary_monitor());
        Main.panel.height = this._settings.get_int('panel-height') * scaleFactor;

        if (this._settings.get_boolean('scroll-panel'))
            Main.panel.connectObject('scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event), this);

        if (this._settings.get_boolean('move-date'))
            this._moveDate(true);

        if (!this._settings.get_boolean('show-dash')) {
            Main.overview.dash.height = 0;
            Main.overview.dash.hide();
        }

        if (!this._settings.get_boolean('show-overview') && Main.layoutManager._startingUp)
            Main.layoutManager.connectObject('startup-complete', () => Main.overview.hide(), this);

        this._dashButton = new DashButton(this._settings);
        Main.panel.addToStatusArea('dash', this._dashButton, -1, 'left');

        this._settings.connectObject('changed', this._restart.bind(this), this);
        Main.layoutManager.connectObject('monitors-changed', this._restart.bind(this), this);
    }

    disable() {
        this._settings.disconnectObject(this);
        this._settings = null;

        this._dashButton?.destroy();
        this._dashButton = null;

        Main.layoutManager.disconnectObject(this);

        Main.overview.dash.show();
        Main.overview.dash.height = -1;
        Main.overview.dash.setMaxSize(-1, -1);

        this._moveDate(false);
        Main.panel.disconnectObject(this);
        Main.panel.height = -1;
    }
}
