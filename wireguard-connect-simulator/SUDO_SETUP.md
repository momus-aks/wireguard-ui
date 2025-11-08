# Setting Up Sudo Permissions for WireGuard

The backend needs sudo permissions to control WireGuard. Here are two ways to set it up:

## Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./setup-sudo.sh
```

This will configure passwordless sudo for WireGuard operations.

## Option 2: Manual Setup

### Step 1: Create a sudoers file

```bash
sudo visudo -f /etc/sudoers.d/wireguard-$(whoami)
```

### Step 2: Add these lines (replace `YOUR_USERNAME` with your actual username):

```
YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/bin/wg-quick
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/mkdir -p /etc/wireguard
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/chmod 755 /etc/wireguard
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/chmod 600 /etc/wireguard/*
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/cp * /etc/wireguard/
YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/bin/ip link show wg*
```

### Step 3: Save and exit

Press `Ctrl+X`, then `Y`, then `Enter` in `visudo`.

### Step 4: Set proper permissions

```bash
sudo chmod 0440 /etc/sudoers.d/wireguard-$(whoami)
```

## Verify Setup

Test if it works:

```bash
# This should NOT prompt for password:
sudo -n mkdir -p /etc/wireguard
sudo -n wg-quick --version
```

If you see "password required" errors, you may need to:
- Log out and log back in
- Or restart your WSL session

## Troubleshooting

### "visudo: command not found"
Install sudo:
```bash
sudo apt update
sudo apt install sudo
```

### "user is not in the sudoers file"
Add your user to sudo group:
```bash
sudo usermod -aG sudo $USER
# Then log out and log back in
```

### Still asking for password?
- Make sure you're using the exact paths shown above
- Check that the sudoers file has correct syntax: `sudo visudo -c`
- Try logging out and back in

## Alternative: Run as Root (Not Recommended)

If you can't configure sudo, you could run the backend as root, but this is **not recommended** for security reasons:

```bash
sudo node server.cjs
```

