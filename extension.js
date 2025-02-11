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

        this._box.connectObject('child-added', (actor, child) => this._setStyle(child), this);
        this.showAppsButton.connectObject('clicked', this._onShowAppsClick.bind(this), this);
    }

    _setStyle(child) {
        if (!child?.first_child?._dot)
            return;

        child.first_child.set_style_class_name('dash-in-panel-icon');
        child.first_child._dot.width = this.iconSize;
        child.first_child._dot.height += 1;
        if (this._settings.get_boolean('colored-dot'))
            child.first_child._dot.add_style_class_name('dash-in-panel-icon-colored-dot');

        this._timeout = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (this._separator)
                this._separator.add_style_class_name('dash-in-panel-separator');

            this._timeout = null;
            return GLib.SOURCE_REMOVE;
        });
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
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
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

        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._dash = new DashPanel(this._settings);
            this.add_child(this._dash._dashContainer);

            this._timeout = null;
            return GLib.SOURCE_REMOVE;
        });

        this.connectObject('destroy', this._destroy.bind(this), this);
    }

    _destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
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
            panel.center = panel.center.filter(item => item != 'dateMenu')
            panel.right.splice(-1, 0, 'dateMenu');
        } else {
            panel.right = panel.right.filter(item => item != 'dateMenu')
            panel.center.push('dateMenu');
        }

        Main.panel._updatePanel();
    }

    _restart() {
        this.disable();
        this.enable();
    }

    enable() {
        this._settings = this.getSettings();

        Main.panel.height = this._settings.get_int('panel-height');

        if (this._settings.get_boolean('scroll-panel'))
            Main.panel.connectObject('scroll-event', (actor, event) => Main.wm.handleWorkspaceScroll(event), this);

        if (this._settings.get_boolean('move-date'))
            this._moveDate(true);

        if (!this._settings.get_boolean('show-dash'))
            Main.overview.dash.hide();

        this._dashButton = new DashButton(this._settings);
        Main.panel.addToStatusArea('dash', this._dashButton, -1, 'left');

        this._settings.connectObject('changed', this._restart.bind(this), this);
    }

    disable() {
        this._dashButton?.destroy();
        this._dashButton = null;

        Main.overview.dash.show();
        this._moveDate(false);
        Main.panel.height = 32;
        Main.panel.disconnectObject(this);

        this._settings.disconnectObject(this);
        this._settings = null;
    }
}
