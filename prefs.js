import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class PowerProfilePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Dash in Panel extension',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);


        const group1 = new Adw.PreferencesGroup();
        page.add(group1);

        const showDash = new Adw.SwitchRow({
            title: 'Show dash in overview',
        });
        group1.add(showDash);
        window._settings.bind('show-dash', showDash, 'active', Gio.SettingsBindFlags.DEFAULT);

        const showApps = new Adw.SwitchRow({
            title: 'Show app grid button',
        });
        group1.add(showApps);
        window._settings.bind('show-apps', showApps, 'active', Gio.SettingsBindFlags.DEFAULT);

        const scrollPanel = new Adw.SwitchRow({
            title: 'Scroll on panel to change workspace',
        });
        group1.add(scrollPanel);
        window._settings.bind('scroll-panel', scrollPanel, 'active', Gio.SettingsBindFlags.DEFAULT);

        const moveDate = new Adw.SwitchRow({
            title: 'Move date to the right',
        });
        group1.add(moveDate);
        window._settings.bind('move-date', moveDate, 'active', Gio.SettingsBindFlags.DEFAULT);


        const group2 = new Adw.PreferencesGroup();
        page.add(group2);

        const coloredDot = new Adw.SwitchRow({
            title: 'Colored running app indicator',
        });
        group2.add(coloredDot);
        window._settings.bind('colored-dot', coloredDot, 'active', Gio.SettingsBindFlags.DEFAULT);

        const adjustmentPanelHeight = new Gtk.Adjustment({
            lower: 16,
            upper: 64,
            step_increment: 1,
        });

        const panelHeight = new Adw.SpinRow({
            title: 'Top panel height (default: 32)',
            adjustment: adjustmentPanelHeight
        });
        group2.add(panelHeight);
        window._settings.bind('panel-height', panelHeight, 'value', Gio.SettingsBindFlags.DEFAULT);

        const adjustmentIconSize = new Gtk.Adjustment({
            lower: 12,
            upper: 56,
            step_increment: 1,
        });

        const iconSize = new Adw.SpinRow({
            title: 'Icon size (default: 20)',
            adjustment: adjustmentIconSize
        });
        group2.add(iconSize);
        window._settings.bind('icon-size', iconSize, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
