# Fix notify block fields in all bot XML files
$botFolder = "e:\dtool\public\Official Bots"
$files = Get-ChildItem -Path $botFolder -Filter "*.xml"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace TYPE with NOTIFICATION_TYPE
    $content = $content -replace '(\u003cfield name=")TYPE(")(\u003e)(info|success|warn|error)(\u003c/field\u003e)', '$1NOTIFICATION_TYPE$2$3$4$5'
    
    # Replace SOUND with NOTIFICATION_SOUND
    $content = $content -replace '(\u003cfield name=")SOUND(")(\u003e)(silent|announcement|earn_money|job_done|error|severe_error)(\u003c/field\u003e)', '$1NOTIFICATION_SOUND$2$3$4$5'
    
    # Save the file back
    Set-Content -Path $file.FullName -Value $content -NoNewline
    
    Write-Host "Fixed: $($file.Name)"
}

Write-Host "`nAll bot files have been fixed!"
