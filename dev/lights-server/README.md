# Lights Server

An HTTP server for hello-lights. Listens on port 9000 and accepts light commands via `POST /run`.

## Running

From the project root:

```bash
npm run dev:server
```

## Running on System Startup with systemd

Create a systemd user service file at `~/.config/systemd/user/hello-lights.service` (example):

```ini
[Unit]
Description=Hello Lights Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/user/Projects/hello-lights
ExecStart=/path/to/node dev/lights-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Replace `/path/to/node` with the full path to your `node` binary (e.g. from `which node`). This is needed because nvm is not available in systemd's environment.

Then enable and start the service:

```bash
systemctl --user daemon-reload
systemctl --user enable hello-lights
systemctl --user start hello-lights
```

To have the service start at boot (before login):

```bash
sudo loginctl enable-linger $USER
```

### Useful commands

```bash
systemctl --user status hello-lights       # check status
systemctl --user restart hello-lights      # restart
journalctl --user -u hello-lights -f       # tail logs
```

