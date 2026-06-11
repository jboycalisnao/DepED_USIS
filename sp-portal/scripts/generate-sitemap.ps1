$siteUrl = $env:SITE_URL

if ([string]::IsNullOrWhiteSpace($siteUrl)) {
  $siteUrl = $env:VITE_SITE_URL
}

if ([string]::IsNullOrWhiteSpace($siteUrl)) {
  $siteUrl = 'https://leonnationalhs.edu.ph'
}

$siteUrl = $siteUrl.TrimEnd('/')
$generatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
$publicDir = Join-Path $PSScriptRoot '..\public'
$outputPath = Join-Path $publicDir 'sitemap.xml'

New-Item -ItemType Directory -Force -Path $publicDir | Out-Null

$xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>$siteUrl/admissions/region-vi/iloilo/302345</loc>
    <lastmod>$generatedAt</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
"@

Set-Content -Path $outputPath -Value $xml -Encoding UTF8
