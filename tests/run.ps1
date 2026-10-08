# Runs tests/index.html in headless Edge and prints the results, then checks
# that sw.js caches every local file the pages and scripts reference.
# Usage: powershell -ExecutionPolicy Bypass -File tests\run.ps1   (exit 1 on failure)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$root = (Resolve-Path "$PSScriptRoot\..").Path
$page = "file:///" + ((Resolve-Path "$PSScriptRoot\index.html").Path -replace '\\', '/')
$profileDir = Join-Path $env:TEMP "tyre-pressures-test-profile"
$dom = & $edge --headless=new --disable-gpu --no-first-run "--user-data-dir=$profileDir" --dump-dom $page 2>$null | Out-String
$summary = [regex]::Match($dom, '<h1 id="summary"[^>]*>([^<]*)</h1>').Groups[1].Value
[regex]::Matches($dom, '<li class="(ok|bad)">([^<]*)</li>') | ForEach-Object {
  [System.Net.WebUtility]::HtmlDecode($_.Groups[2].Value)
}
""
if (-not $summary) { "No results: the test page did not run."; exit 1 }
$summary

# Offline cache check: every local file referenced must be in sw.js FILES.
$sw = Get-Content "$root\sw.js" -Raw
$listed = [regex]::Matches($sw, '"([^"]+\.(?:html|css|js|woff2|png|ico|jpg|webp|webmanifest))"') | ForEach-Object { $_.Groups[1].Value }
$refs = @()
foreach ($f in @("index.html", "sources.html")) {
  $html = Get-Content "$root\$f" -Raw
  $refs += [regex]::Matches($html, '(?:src|href)="(?!//)([^":#?]+\.(?:css|js|woff2|png|ico|jpg|webmanifest))"') | ForEach-Object { $_.Groups[1].Value }
}
$refs += [regex]::Matches((Get-Content "$root\css\style.css" -Raw), 'url\("\.\./([^"]+)"\)') | ForEach-Object { $_.Groups[1].Value }
$refs += [regex]::Matches((Get-Content "$root\js\images.js" -Raw), '"(img/[^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$missing = $refs | Sort-Object -Unique | Where-Object { $listed -notcontains $_ -and $_ -ne "sw.js" }
$absent = $listed | Where-Object { $_ -ne "./" -and -not (Test-Path (Join-Path $root $_)) }
if ($missing) { "Not cached for offline use (add to sw.js FILES): " + ($missing -join ", ") }
if ($absent) { "Listed in sw.js but missing on disk: " + ($absent -join ", ") }
if ($missing -or $absent) { exit 1 }
"Offline cache list: OK (" + $listed.Count + " files)"
if ($summary -notlike "ALL PASSED*") { exit 1 }
