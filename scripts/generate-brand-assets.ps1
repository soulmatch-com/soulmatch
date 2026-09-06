param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath
)

Add-Type -AssemblyName System.Drawing

function Get-ContentBounds {
  param(
    [System.Drawing.Bitmap]$Bitmap
  )

  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = 0
  $maxY = 0

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw "No visible pixels were found in $SourcePath."
  }

  return [System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
}

function Copy-Crop {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [System.Drawing.Rectangle]$Bounds
  )

  $cropped = New-Object System.Drawing.Bitmap $Bounds.Width, $Bounds.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cropped.SetResolution($Bitmap.HorizontalResolution, $Bitmap.VerticalResolution)
  $graphics = [System.Drawing.Graphics]::FromImage($cropped)
  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage(
      $Bitmap,
      [System.Drawing.Rectangle]::new(0, 0, $Bounds.Width, $Bounds.Height),
      $Bounds.X,
      $Bounds.Y,
      $Bounds.Width,
      $Bounds.Height,
      [System.Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $graphics.Dispose()
  }

  return $cropped
}

function Resize-Image {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$Size
  )

  $canvas = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $canvas.SetResolution($Bitmap.HorizontalResolution, $Bitmap.VerticalResolution)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $scale = [Math]::Min($Size / $Bitmap.Width, $Size / $Bitmap.Height)
    $drawWidth = [Math]::Max(1, [int][Math]::Round($Bitmap.Width * $scale))
    $drawHeight = [Math]::Max(1, [int][Math]::Round($Bitmap.Height * $scale))
    $offsetX = [int][Math]::Round(($Size - $drawWidth) / 2)
    $offsetY = [int][Math]::Round(($Size - $drawHeight) / 2)

    $graphics.DrawImage(
      $Bitmap,
      [System.Drawing.Rectangle]::new($offsetX, $offsetY, $drawWidth, $drawHeight),
      0,
      0,
      $Bitmap.Width,
      $Bitmap.Height,
      [System.Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $graphics.Dispose()
  }

  return $canvas
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-Icon {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $hIcon = $Bitmap.GetHicon()
  try {
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
    try {
      $icon.Save($stream)
    } finally {
      $stream.Dispose()
    }
  } finally {
    # The icon handle is process-local and disposed with the script process.
  }
}

$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourcePath).Path)
try {
  $logoBounds = Get-ContentBounds -Bitmap $source
  $logoBitmap = Copy-Crop -Bitmap $source -Bounds $logoBounds
  Save-Png -Bitmap $logoBitmap -Path 'public/brand/mythirumanam-logo.png'

  $emblemRight = [Math]::Min($logoBounds.Left + 560, $logoBounds.Right)
  $emblemBounds = [System.Drawing.Rectangle]::FromLTRB($logoBounds.Left, $logoBounds.Top, $emblemRight, $logoBounds.Bottom)
  $emblemCrop = Copy-Crop -Bitmap $source -Bounds $emblemBounds
  $emblemVisibleBounds = Get-ContentBounds -Bitmap $emblemCrop
  $emblemBitmap = Copy-Crop -Bitmap $emblemCrop -Bounds $emblemVisibleBounds

  $icon192 = Resize-Image -Bitmap $emblemBitmap -Size 192
  $icon512 = Resize-Image -Bitmap $emblemBitmap -Size 512
  $apple180 = Resize-Image -Bitmap $emblemBitmap -Size 180
  $favicon48 = Resize-Image -Bitmap $emblemBitmap -Size 48

  try {
    Save-Png -Bitmap $icon192 -Path 'public/brand/mythirumanam-icon-192.png'
    Save-Png -Bitmap $icon512 -Path 'src/app/icon.png'
    Save-Png -Bitmap $apple180 -Path 'src/app/apple-icon.png'
    Save-Icon -Bitmap $favicon48 -Path 'src/app/favicon.ico'
  } finally {
    $icon192.Dispose()
    $icon512.Dispose()
    $apple180.Dispose()
    $favicon48.Dispose()
  }
} finally {
  $source.Dispose()
  $logoBitmap.Dispose()
  $emblemCrop.Dispose()
  $emblemBitmap.Dispose()
}
