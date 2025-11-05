import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class IPAddressPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // General page
        const generalPage = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(generalPage);

        // Appearance group
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Configure how the indicator appears'),
        });
        generalPage.add(appearanceGroup);

        // Placement row - FIXED: Use actual values for storage, display names for UI
        const placementRow = new Adw.ComboRow({
            title: _('Panel Placement'),
            subtitle: _('Where to show the indicator in the panel'),
        });
        
        // Create the string list with display names
        const placementModel = new Gtk.StringList();
        placementModel.append('Left');
        placementModel.append('Center');
        placementModel.append('Right');
        placementRow.set_model(placementModel);
        
        appearanceGroup.add(placementRow);

        // Bind placement setting with mapping
        settings.bind('placement', placementRow, 'selected',
            Gio.SettingsBindFlags.DEFAULT);

        // Behavior group
        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Configure how the indicator behaves'),
        });
        generalPage.add(behaviorGroup);

        // Refresh interval row
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Interval'),
            subtitle: _('Seconds between IP address updates'),
            adjustment: new Gtk.Adjustment({
                value: 300,
                lower: 30,
                upper: 3600,
                step_increment: 30,
            }),
        });
        behaviorGroup.add(refreshRow);

        // Show/hide toggles
        const showPublicRow = new Adw.SwitchRow({
            title: _('Show Public IP'),
            subtitle: _('Display public IP address in menu'),
        });
        behaviorGroup.add(showPublicRow);

        const showLocalRow = new Adw.SwitchRow({
            title: _('Show Local IP'), 
            subtitle: _('Display local IP address in menu'),
        });
        behaviorGroup.add(showLocalRow);

        // Bind all settings
        settings.bind('refresh-interval', refreshRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        settings.bind('show-public-ip', showPublicRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        settings.bind('show-local-ip', showLocalRow, 'active', 
            Gio.SettingsBindFlags.DEFAULT);
        
        // Connect to placement changes to ensure proper values
        placementRow.connect('notify::selected', () => {
            const selected = placementRow.get_selected();
            let value;
            switch (selected) {
                case 0: value = 'left'; break;
                case 1: value = 'center'; break;
                case 2: value = 'right'; break;
                default: value = 'right';
            }
            settings.set_string('placement', value);
        });
        
        // Set initial selection based on current setting
        const currentPlacement = settings.get_string('placement');
        let initialSelection = 2; // default to right
        switch (currentPlacement) {
            case 'left': initialSelection = 0; break;
            case 'center': initialSelection = 1; break;
            case 'right': initialSelection = 2; break;
        }
        placementRow.set_selected(initialSelection);
    }
}
