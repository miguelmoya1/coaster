package printer

import (
	"context"
	"fmt"
	"net"
	"sort"
	"sync"
	"time"
)

type Kind string

const (
	KindUSB       Kind = "usb"
	KindSerial    Kind = "serial"
	KindBluetooth Kind = "bluetooth"
	KindNetwork   Kind = "network"
)

type Discovered struct {
	Kind   Kind   `json:"kind"`
	Target string `json:"target"`
	Label  string `json:"label"`
}

const (
	scanTimeout = 400 * time.Millisecond
	scanWorkers = 64
)

func Discover(ctx context.Context) []Discovered {
	found := localDiscovered()

	for _, target := range ScanNetwork(ctx) {
		found = append(found, Discovered{
			Kind:   KindNetwork,
			Target: target,
			Label:  "Network printer at " + target,
		})
	}

	return found
}

func localDiscovered() []Discovered {
	candidates := LocalCandidates()
	found := make([]Discovered, 0, len(candidates))
	for _, target := range candidates {
		found = append(found, Discovered{
			Kind:   localKind(target),
			Target: target,
			Label:  localLabel(target),
		})
	}
	return found
}

func ScanNetwork(ctx context.Context) []string {
	hosts := localSubnetHosts()
	if len(hosts) == 0 {
		return nil
	}

	queue := make(chan string)
	results := make(chan string)

	var wg sync.WaitGroup
	for range scanWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for host := range queue {
				target := net.JoinHostPort(host, DefaultPort)
				if dialable(ctx, target) {
					results <- target
				}
			}
		}()
	}

	go func() {
		defer close(queue)
		for _, host := range hosts {
			select {
			case <-ctx.Done():
				return
			case queue <- host:
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	var found []string
	for target := range results {
		found = append(found, target)
	}

	sort.Strings(found)
	return found
}

func dialable(ctx context.Context, target string) bool {
	ctx, cancel := context.WithTimeout(ctx, scanTimeout)
	defer cancel()

	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", target)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func localSubnetHosts() []string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return nil
	}

	seen := map[string]bool{}
	var hosts []string

	for _, addr := range addrs {
		ipnet, ok := addr.(*net.IPNet)
		if !ok || ipnet.IP.IsLoopback() {
			continue
		}
		ipv4 := ipnet.IP.To4()
		if ipv4 == nil || !ipv4.IsPrivate() {
			continue
		}

		ones, bits := ipnet.Mask.Size()
		if bits != 32 || ones < 22 {
			continue
		}

		for _, host := range expand(ipnet, ipv4) {
			if !seen[host] {
				seen[host] = true
				hosts = append(hosts, host)
			}
		}
	}

	return hosts
}

func expand(ipnet *net.IPNet, self net.IP) []string {
	network := self.Mask(ipnet.Mask)
	mask := net.IP(ipnet.Mask).To4()

	var broadcast net.IP
	for i := range 4 {
		broadcast = append(broadcast, network[i]|^mask[i])
	}

	var hosts []string
	for ip := nextIP(network); !ip.Equal(broadcast); ip = nextIP(ip) {
		if !ip.Equal(self) {
			hosts = append(hosts, ip.String())
		}
	}
	return hosts
}

func nextIP(ip net.IP) net.IP {
	next := make(net.IP, len(ip))
	copy(next, ip)
	for i := len(next) - 1; i >= 0; i-- {
		next[i]++
		if next[i] != 0 {
			break
		}
	}
	return next
}

func localLabel(target string) string {
	return fmt.Sprintf("%s (%s)", target, localKind(target))
}
