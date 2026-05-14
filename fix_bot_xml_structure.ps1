
$botFolder = "e:\dtool\public\Official Bots"
$files = Get-ChildItem -Path $botFolder -Filter "*.xml"

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $newLines = @()
    $i = 0
    $modified = $false
    
    while ($i -lt $lines.Count) {
        $line = $lines[$i]
        
        # Check for the specific invalid text_join block
        if ($line -match '<block type="text_join">') {
            # Check context to ensure it's the Digit Power one we want to remove
            $isTarget = $false
            for ($k = 0; $k -lt 5; $k++) {
                if (($i + $k -lt $lines.Count) -and ($lines[$i + $k] -match "Digit Power")) {
                    $isTarget = $true
                    break
                }
            }

            if ($isTarget) {
                Write-Host "Found invalid text_join in $($file.Name) at line $($i+1)"
                
                # Find the end of this block
                $blockDepth = 0
                $endIndex = -1
                
                for ($j = $i; $j -lt $lines.Count; $j++) {
                    if ($lines[$j] -match "<block") { $blockDepth++ }
                    if ($lines[$j] -match "</block>") { $blockDepth-- }
                    
                    if ($blockDepth -eq 0) {
                        $endIndex = $j
                        break
                    }
                }
                
                if ($endIndex -ne -1) {
                    # Extract content inside <next>...</next> of this block
                    # The <next> tag should be somewhere inside
                    $nextStart = -1
                    $nextEnd = -1
                    $nextDepth = 0
                    
                    for ($j = $i; $j -le $endIndex; $j++) {
                        if ($lines[$j] -match "<next>") {
                            if ($nextStart -eq -1) { $nextStart = $j }
                            $nextDepth++
                        }
                        if ($lines[$j] -match "</next>") {
                            $nextDepth--
                            if ($nextDepth -eq 0 -and $nextStart -ne -1) {
                                $nextEnd = $j
                                break # Found the immediate closing next
                            }
                        }
                    }
                    
                    if ($nextStart -ne -1 -and $nextEnd -ne -1) {
                        # We found the inner next block.
                        # We want to keep lines ($nextStart + 1) to ($nextEnd - 1)
                        # And add them to $newLines
                        for ($k = $nextStart + 1; $k -lt $nextEnd; $k++) {
                            $newLines += $lines[$k]
                        }
                        
                        $i = $endIndex + 1
                        $modified = $true
                        continue
                    }
                }
            }
        }
        
        $newLines += $line
        $i++
    }
    
    if ($modified) {
        $newLines | Set-Content $file.FullName
        Write-Host "Fixed $($file.Name)"
    }
}

Write-Host "Done processing files."
