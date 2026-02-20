$tcp = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($tcp) {
    $pid5000 = $tcp.OwningProcess
    Write-Host "Found process $pid5000 on port 5000"
    
    # Find parent
    try {
        $parent = (Get-CimInstance Win32_Process -Filter "ProcessId = $pid5000").ParentProcessId
        if ($parent) {
            Write-Host "Found parent process $parent"
             Write-Host "Killing parent $parent..."
            Stop-Process -Id $parent -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Could not find/kill parent."
    }
    
    Write-Host "Killing child $pid5000..."
    Stop-Process -Id $pid5000 -Force -ErrorAction SilentlyContinue
    Write-Host "Port 5000 should be free."
} else {
    Write-Host "No process found on port 5000."
}
