# Debugging iperf Traffic Not Showing

If iperf traffic isn't showing in the graph, follow these steps:

## Step 1: Verify Interfaces Are Connected

```bash
# Check if interfaces are up
ip link show | grep wg

# Check WireGuard status (requires sudo)
sudo wg show

# You should see both wg0 and wg1 with peers listed
```

## Step 2: Verify Connectivity

```bash
# From Machine A (10.0.8.1), ping Machine B
ping -I wg0 10.0.8.2

# From Machine B (10.0.8.2), ping Machine A  
ping -I wg1 10.0.8.1
```

If ping doesn't work, the WireGuard connection isn't established properly.

## Step 3: Check if Traffic Goes Through WireGuard

**Important:** When running iperf, you MUST bind to the WireGuard interface!

```bash
# Terminal 1 - Server (bind to WireGuard IP)
iperf3 -s -B 10.0.8.1

# Terminal 2 - Client (bind to WireGuard IP)
iperf3 -c 10.0.8.1 -B 10.0.8.2 -t 60
```

**The `-B` flag is critical!** It binds iperf to the WireGuard IP address.

## Step 4: Monitor Traffic in Real-Time

While iperf is running, check if traffic is actually going through:

```bash
# Watch /proc/net/dev (updates every second)
watch -n 1 'cat /proc/net/dev | grep wg'

# You should see bytes and packets increasing
```

## Step 5: Check Backend Logs

Look at your backend terminal. You should see:
```
[Stats A] Interface: wg0, RX: <bytes>, TX: <bytes>, Rate: <rate> B/s, ...
```

If you see all zeros, traffic isn't going through WireGuard.

## Step 6: Verify Routing

```bash
# Check routing table
ip route show

# Traffic to 10.0.8.0/24 should go through wg0 or wg1
```

## Common Issues

### Issue 1: iperf Not Using WireGuard
**Symptom:** iperf runs but stats stay at 0

**Solution:** Make sure you use `-B` flag:
```bash
iperf3 -s -B 10.0.8.1  # Server
iperf3 -c 10.0.8.1 -B 10.0.8.2  # Client
```

### Issue 2: Interfaces Not Actually Connected
**Symptom:** `sudo wg show` shows no peers or handshake

**Solution:** 
- Regenerate configs
- Make sure both interfaces are connected
- Check firewall allows UDP ports 51820/51821

### Issue 3: Traffic Going Through Wrong Interface
**Symptom:** iperf works but stats don't increase

**Solution:**
- Use `-B` to bind to WireGuard IP
- Check `ip route` to verify routing
- Use `tcpdump` to verify: `sudo tcpdump -i wg0`

## Quick Test

Run this to generate some traffic:

```bash
# Terminal 1
ping -I wg0 10.0.8.2

# Terminal 2 (while ping runs)
watch -n 1 'cat /proc/net/dev | grep wg0'
```

You should see packets increasing. If not, the interfaces aren't connected.

