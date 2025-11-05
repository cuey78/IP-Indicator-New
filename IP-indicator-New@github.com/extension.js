/* IP Address Indicator Extension
 * Compatible with GNOME 49+
 * Shows current public IP / local IP and responds to live preference changes.
 * by cuey78
 */

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const IP_URL = 'https://api.ipify.org';

export default class IPAddressExtension extends Extension {
    _indicator = null;
    _settings = null;
    _timeoutId = 0;
    _session = null;
    _icon = null;
    _label = null;

    enable() {
        this._settings = this.getSettings();
        this._session = new Soup.Session();

        // Create indicator
        this._buildIndicator();

        // Add to panel
        Main.panel.addToStatusArea(
            'ipaddress-indicator',
            this._indicator,
            1,
            this._getPanelPosition()
        );

        // Start refresh timer
        this._restartRefreshTimer();

        // Watch for settings changes
        this._settings.connect('changed', (settings, key) => {
            if (key === 'placement') {
                this._repositionIndicator();
            } else if (key === 'refresh-interval') {
                this._restartRefreshTimer();
            } else if (key === 'show-public-ip' || key === 'show-local-ip') {
                this._refreshIP();
            }
        });
    }

    disable() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._session) {
            this._session.abort();
            this._session = null;
        }

        this._settings = null;
    }

    _buildIndicator() {
        this._indicator = new PanelMenu.Button(0.0, 'IP Address Indicator');

        this._icon = new St.Icon({
            icon_name: 'network-transmit-receive-symbolic',
            style_class: 'system-status-icon',
        });

        this._label = new St.Label({
            text: 'Loading...',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        box.add_child(this._icon);
        box.add_child(this._label);
        this._indicator.add_child(box);

        this._refreshIP();
    }

   _getPanelPosition() {
    const placement = this._settings.get_string('placement');
    switch (placement) {
        case 'left':
            return 'left';
        case 'center':
            return 'center';
        case 'right':
            return 'right';
        default:
            return 'right'; // fallback
    }
}

    _restartRefreshTimer() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }

        const interval = this._settings.get_int('refresh-interval');
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._refreshIP();
            return GLib.SOURCE_CONTINUE;
        });
    }

  _repositionIndicator() {
    if (!this._indicator)
        return;

    // Completely destroy and recreate the indicator
    this._indicator.destroy();
    this._indicator = null;
    
    // Rebuild everything
    this._buildIndicator();

    // Re-add to panel at new position
    Main.panel.addToStatusArea(
        'ipaddress-indicator',
        this._indicator,
        1,
        this._getPanelPosition()
    );
}

    _refreshIP() {
        const showPublic = this._settings.get_boolean('show-public-ip');
        const showLocal = this._settings.get_boolean('show-local-ip');

        if (!showPublic && !showLocal) {
            this._label.set_text('');
            return;
        }

        // Fetch public IP
        if (showPublic) {
            const message = Soup.Message.new('GET', IP_URL);
            this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (sess, res) => {
                try {
                    const bytes = this._session.send_and_read_finish(res);
                    const data = new TextDecoder().decode(bytes.get_data());
                    const ip = data.trim();

                    // If also showing local IP
                    if (showLocal) {
                        const local = this._getLocalIP();
                        this._label.set_text(`${ip} | ${local}`);
                    } else {
                        this._label.set_text(ip);
                    }
                } catch (e) {
                    this._label.set_text('Error');
                    logError(e);
                }
            });
        } else if (showLocal) {
            this._label.set_text(this._getLocalIP());
        }
    }

    _getLocalIP() {
        try {
            const [ok, out] = GLib.spawn_command_line_sync("hostname -I");
            if (ok && out) {
                const ip = new TextDecoder().decode(out).trim().split(" ")[0];
                return ip || "N/A";
            }
        } catch (e) {
            logError(e);
        }
        return "N/A";
    }
}

