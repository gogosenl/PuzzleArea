Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class AssetCleaner
{
    static double Distance(Color a, Color b)
    {
        int dr = a.R - b.R;
        int dg = a.G - b.G;
        int db = a.B - b.B;
        return Math.Sqrt(dr * dr + dg * dg + db * db);
    }

    static bool IsBackground(Color pixel, List<Color> samples, int tolerance)
    {
        foreach (Color sample in samples)
        {
            if (Distance(pixel, sample) <= tolerance) return true;
        }
        return false;
    }

    public static Bitmap Clean(Bitmap bmp, int tolerance, int pad)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        var samples = new List<Color>();
        samples.Add(bmp.GetPixel(0, 0));
        samples.Add(bmp.GetPixel(w - 1, 0));
        samples.Add(bmp.GetPixel(0, h - 1));
        samples.Add(bmp.GetPixel(w - 1, h - 1));
        samples.Add(bmp.GetPixel(Math.Min(8, w - 1), Math.Min(8, h - 1)));
        samples.Add(bmp.GetPixel(Math.Max(0, w - 9), Math.Min(8, h - 1)));
        samples.Add(bmp.GetPixel(Math.Min(8, w - 1), Math.Max(0, h - 9)));
        samples.Add(bmp.GetPixel(Math.Max(0, w - 9), Math.Max(0, h - 9)));

        var visited = new bool[w * h];
        var queue = new Queue<Point>();
        for (int x = 0; x < w; x++)
        {
            queue.Enqueue(new Point(x, 0));
            queue.Enqueue(new Point(x, h - 1));
        }
        for (int y = 0; y < h; y++)
        {
            queue.Enqueue(new Point(0, y));
            queue.Enqueue(new Point(w - 1, y));
        }

        while (queue.Count > 0)
        {
            Point p = queue.Dequeue();
            if (p.X < 0 || p.X >= w || p.Y < 0 || p.Y >= h) continue;
            int idx = p.Y * w + p.X;
            if (visited[idx]) continue;
            visited[idx] = true;
            Color pixel = bmp.GetPixel(p.X, p.Y);
            if (!IsBackground(pixel, samples, tolerance)) continue;

            bmp.SetPixel(p.X, p.Y, Color.Transparent);
            queue.Enqueue(new Point(p.X + 1, p.Y));
            queue.Enqueue(new Point(p.X - 1, p.Y));
            queue.Enqueue(new Point(p.X, p.Y + 1));
            queue.Enqueue(new Point(p.X, p.Y - 1));
        }

        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                if (bmp.GetPixel(x, y).A > 4)
                {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0 || maxY < 0) return bmp;
        minX = Math.Max(0, minX - pad);
        minY = Math.Max(0, minY - pad);
        maxX = Math.Min(w - 1, maxX + pad);
        maxY = Math.Min(h - 1, maxY + pad);
        int newW = maxX - minX + 1;
        int newH = maxY - minY + 1;
        Bitmap trimmed = new Bitmap(newW, newH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(trimmed))
        {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);
            g.DrawImage(bmp, new Rectangle(0, 0, newW, newH), new Rectangle(minX, minY, newW, newH), GraphicsUnit.Pixel);
        }
        bmp.Dispose();
        return trimmed;
    }

    public static Bitmap KeepLargestComponent(Bitmap bmp, int pad)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        var visited = new bool[w * h];
        var best = new List<int>();
        int[] dx = new int[] { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy = new int[] { -1, -1, -1, 0, 0, 1, 1, 1 };

        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                int start = y * w + x;
                if (visited[start] || bmp.GetPixel(x, y).A <= 4) continue;

                var component = new List<int>();
                var queue = new Queue<Point>();
                queue.Enqueue(new Point(x, y));
                visited[start] = true;

                while (queue.Count > 0)
                {
                    Point p = queue.Dequeue();
                    int idx = p.Y * w + p.X;
                    component.Add(idx);

                    for (int i = 0; i < dx.Length; i++)
                    {
                        int nx = p.X + dx[i];
                        int ny = p.Y + dy[i];
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        int nidx = ny * w + nx;
                        if (visited[nidx] || bmp.GetPixel(nx, ny).A <= 4) continue;
                        visited[nidx] = true;
                        queue.Enqueue(new Point(nx, ny));
                    }
                }

                if (component.Count > best.Count) best = component;
            }
        }

        if (best.Count == 0) return bmp;
        var keep = new bool[w * h];
        foreach (int idx in best) keep[idx] = true;
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                int idx = y * w + x;
                if (!keep[idx] && bmp.GetPixel(x, y).A > 4)
                {
                    bmp.SetPixel(x, y, Color.Transparent);
                }
            }
        }

        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                if (bmp.GetPixel(x, y).A > 4)
                {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0 || maxY < 0) return bmp;
        minX = Math.Max(0, minX - pad);
        minY = Math.Max(0, minY - pad);
        maxX = Math.Min(w - 1, maxX + pad);
        maxY = Math.Min(h - 1, maxY + pad);
        int newW = maxX - minX + 1;
        int newH = maxY - minY + 1;
        Bitmap trimmed = new Bitmap(newW, newH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(trimmed))
        {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);
            g.DrawImage(bmp, new Rectangle(0, 0, newW, newH), new Rectangle(minX, minY, newW, newH), GraphicsUnit.Pixel);
        }
        bmp.Dispose();
        return trimmed;
    }

    public static void RemoveRedFringe(Bitmap bmp)
    {
        for (int y = 0; y < bmp.Height; y++)
        {
            for (int x = 0; x < bmp.Width; x++)
            {
                Color pixel = bmp.GetPixel(x, y);
                if (pixel.A > 0 && pixel.R > 130 && pixel.G < 82 && pixel.B < 82)
                {
                    bmp.SetPixel(x, y, Color.Transparent);
                }
            }
        }
    }
}
"@

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$source = "C:\Users\KARBORU\.codex\generated_images\019f5b52-22ac-7732-a23d-8fe088b3d102\call_08MqjqIFAF5qj6PZYzuUr8kj.png"
$cleanHeaderSource = "C:\Users\KARBORU\.codex\generated_images\019f5b52-22ac-7732-a23d-8fe088b3d102\call_dmMQxsNkGDCO4HFtr7Mu1kbY.png"
$outDir = Join-Path $root "assets\ui-a-realistic"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-TransparentBitmap([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Color-Distance($a, $b) {
  $dr = [int]$a.R - [int]$b.R
  $dg = [int]$a.G - [int]$b.G
  $db = [int]$a.B - [int]$b.B
  return [Math]::Sqrt($dr * $dr + $dg * $dg + $db * $db)
}

function Test-BackgroundPixel($pixel, $samples, [int]$tolerance) {
  foreach ($sample in $samples) {
    if ((Color-Distance $pixel $sample) -le $tolerance) {
      return $true
    }
  }
  return $false
}

function Remove-EdgeBackground([System.Drawing.Bitmap]$bmp, [int]$tolerance = 28) {
  $w = $bmp.Width
  $h = $bmp.Height
  $samples = New-Object System.Collections.Generic.List[System.Drawing.Color]
  $samples.Add($bmp.GetPixel(0, 0))
  $samples.Add($bmp.GetPixel(($w - 1), 0))
  $samples.Add($bmp.GetPixel(0, ($h - 1)))
  $samples.Add($bmp.GetPixel(($w - 1), ($h - 1)))
  for ($x = 0; $x -lt $w; $x += [Math]::Max(1, [int]($w / 12))) {
    $samples.Add($bmp.GetPixel($x, 0))
    $samples.Add($bmp.GetPixel($x, ($h - 1)))
  }
  for ($y = 0; $y -lt $h; $y += [Math]::Max(1, [int]($h / 12))) {
    $samples.Add($bmp.GetPixel(0, $y))
    $samples.Add($bmp.GetPixel(($w - 1), $y))
  }
  $visited = New-Object 'bool[,]' $w, $h
  $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

  for ($x = 0; $x -lt $w; $x++) {
    $queue.Enqueue((New-Object System.Drawing.Point $x, 0))
    $queue.Enqueue((New-Object System.Drawing.Point $x, ($h - 1)))
  }
  for ($y = 0; $y -lt $h; $y++) {
    $queue.Enqueue((New-Object System.Drawing.Point 0, $y))
    $queue.Enqueue((New-Object System.Drawing.Point ($w - 1), $y))
  }

  while ($queue.Count -gt 0) {
    $p = $queue.Dequeue()
    if ($p.X -lt 0 -or $p.X -ge $w -or $p.Y -lt 0 -or $p.Y -ge $h) { continue }
    if ($visited[$p.X, $p.Y]) { continue }
    $visited[$p.X, $p.Y] = $true

    $pixel = $bmp.GetPixel($p.X, $p.Y)
    if (-not (Test-BackgroundPixel $pixel $samples $tolerance)) { continue }

    $bmp.SetPixel($p.X, $p.Y, [System.Drawing.Color]::Transparent)
    $queue.Enqueue((New-Object System.Drawing.Point ($p.X + 1), $p.Y))
    $queue.Enqueue((New-Object System.Drawing.Point ($p.X - 1), $p.Y))
    $queue.Enqueue((New-Object System.Drawing.Point $p.X, ($p.Y + 1)))
    $queue.Enqueue((New-Object System.Drawing.Point $p.X, ($p.Y - 1)))
  }
}

function Trim-TransparentPadding([System.Drawing.Bitmap]$bmp, [int]$pad = 6) {
  $minX = $bmp.Width
  $minY = $bmp.Height
  $maxX = -1
  $maxY = -1
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ($bmp.GetPixel($x, $y).A -gt 4) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0 -or $maxY -lt 0) { return $bmp }

  $minX = [Math]::Max(0, $minX - $pad)
  $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
  $maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)
  $newW = $maxX - $minX + 1
  $newH = $maxY - $minY + 1
  $trimmed = New-Object System.Drawing.Bitmap $newW, $newH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($trimmed)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0,0,$newW,$newH), (New-Object System.Drawing.Rectangle $minX,$minY,$newW,$newH), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Dispose()
  return $trimmed
}

function Crop-Asset($src, $item) {
  $dst = New-Object System.Drawing.Bitmap $item.w, $item.h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $targetRect = New-Object System.Drawing.Rectangle 0, 0, $item.w, $item.h
  $sourceRect = New-Object System.Drawing.Rectangle $item.x, $item.y, $item.w, $item.h
  $g.DrawImage($src, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $trimmed = [AssetCleaner]::Clean($dst, [int]$item.tolerance, [int]$item.pad)
  if (($item.PSObject.Properties.Name -contains "keepLargest") -and $item.keepLargest) {
    $trimmed = [AssetCleaner]::KeepLargestComponent($trimmed, [int]$item.pad)
  }
  $trimmed.Save((Join-Path $outDir $item.file), [System.Drawing.Imaging.ImageFormat]::Png)
  $trimmed.Dispose()
}

function Save-Art($art, [string]$name) {
  $path = Join-Path $outDir $name
  $art.Graphics.Dispose()
  $art.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $art.Bitmap.Dispose()
}

function Save-ResizedImage([string]$sourcePath, [string]$name, [int]$targetW, [bool]$keepLargest = $false) {
  if (-not (Test-Path $sourcePath)) { return }
  $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
  $targetH = [int][Math]::Round($srcImage.Height * ($targetW / $srcImage.Width))
  $art = New-TransparentBitmap $targetW $targetH
  $art.Graphics.DrawImage($srcImage, 0, 0, $targetW, $targetH)
  $srcImage.Dispose()
  if ($keepLargest) {
    $art.Bitmap = [AssetCleaner]::KeepLargestComponent($art.Bitmap, 0)
    [AssetCleaner]::RemoveRedFringe($art.Bitmap)
  }
  Save-Art $art $name
}

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Save-GlassButton([string]$name, [System.Drawing.Color]$innerTop, [System.Drawing.Color]$innerBottom, [System.Drawing.Color]$rimTop, [System.Drawing.Color]$rimBottom) {
  $art = New-TransparentBitmap 960 180
  $g = $art.Graphics
  $outerRect = New-Object System.Drawing.RectangleF 8, 8, 944, 164
  $outerPath = New-RoundedPath 8 8 944 164 44
  $outerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $outerRect, $rimTop, $rimBottom, 90
  $g.FillPath($outerBrush, $outerPath)
  $outerBrush.Dispose()

  $innerRect = New-Object System.Drawing.RectangleF 28, 27, 904, 126
  $innerPath = New-RoundedPath 28 27 904 126 34
  $innerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $innerRect, $innerTop, $innerBottom, 90
  $g.FillPath($innerBrush, $innerPath)
  $innerBrush.Dispose()

  $shinePath = New-RoundedPath 42 36 876 48 22
  $shineBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 42, 36, 876, 48), ([System.Drawing.Color]::FromArgb(95, 255, 255, 255)), ([System.Drawing.Color]::FromArgb(0, 255, 255, 255)), 90
  $g.FillPath($shineBrush, $shinePath)
  $shineBrush.Dispose()
  $highlightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 255, 246, 190)), 4
  $g.DrawPath($highlightPen, $innerPath)
  $highlightPen.Dispose()
  $deepPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 8, 20, 38)), 3
  $g.DrawPath($deepPen, $outerPath)
  $deepPen.Dispose()
  $innerPath.Dispose(); $outerPath.Dispose(); $shinePath.Dispose()
  Save-Art $art $name
}

$items = @(
  [pscustomobject]@{ file="reward-header-badge.png"; x=0; y=0; w=1000; h=455; tolerance=36; pad=18 },
  [pscustomobject]@{ file="reward-double-button.png"; x=1008; y=42; w=410; h=238; tolerance=40; pad=10; keepLargest=$true },
  [pscustomobject]@{ file="reward-continue-button.png"; x=980; y=294; w=510; h=210; tolerance=34; pad=10; keepLargest=$true },
  [pscustomobject]@{ file="icon-home.png"; x=104; y=486; w=270; h=245; tolerance=40; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="icon-levels.png"; x=370; y=486; w=270; h=245; tolerance=40; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="icon-shop.png"; x=620; y=486; w=270; h=245; tolerance=40; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="icon-settings.png"; x=866; y=486; w=270; h=245; tolerance=40; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="icon-hint.png"; x=1134; y=486; w=270; h=245; tolerance=40; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="coin-layer.png"; x=96; y=738; w=300; h=286; tolerance=42; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="coin-hint.png"; x=436; y=738; w=300; h=286; tolerance=42; pad=8; keepLargest=$true },
  [pscustomobject]@{ file="button-hint.png"; x=770; y=724; w=722; h=244; tolerance=40; pad=10; keepLargest=$true }
)

$src = [System.Drawing.Image]::FromFile($source)
foreach ($item in $items) {
  Crop-Asset $src $item
}
$src.Dispose()

Save-ResizedImage $cleanHeaderSource "reward-header-badge.png" 966

Save-GlassButton "reward-double-bg.png" `
  ([System.Drawing.Color]::FromArgb(255, 46, 74, 104)) `
  ([System.Drawing.Color]::FromArgb(255, 17, 31, 51)) `
  ([System.Drawing.Color]::FromArgb(255, 255, 228, 124)) `
  ([System.Drawing.Color]::FromArgb(255, 205, 120, 28))

$preview = New-TransparentBitmap 1500 820
$g = $preview.Graphics
$bgRect = New-Object System.Drawing.RectangleF 0, 0, 1500, 820
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect, ([System.Drawing.Color]::FromArgb(255, 255, 243, 222)), ([System.Drawing.Color]::FromArgb(255, 14, 28, 48)), 90
$g.FillRectangle($bg, 0, 0, 1500, 820)
$bg.Dispose()
$titleFont = New-Object System.Drawing.Font "Arial", 44, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$labelFont = New-Object System.Drawing.Font "Arial", 22, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 18, 28, 42))
$light = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 250, 240))
$g.DrawString("A Realistic Asset Set", $titleFont, $dark, 48, 34)

$previewItems = @(
  [pscustomobject]@{ file="reward-header-badge.png"; x=45; y=120; w=420; h=210; label="Header Badge" },
  [pscustomobject]@{ file="reward-double-button.png"; x=520; y=138; w=285; h=150; label="2x Button" },
  [pscustomobject]@{ file="reward-continue-button.png"; x=860; y=150; w=270; h=120; label="Continue Button" },
  [pscustomobject]@{ file="icon-home.png"; x=45; y=405; w=92; h=92; label="Home" },
  [pscustomobject]@{ file="icon-levels.png"; x=165; y=405; w=92; h=92; label="Levels" },
  [pscustomobject]@{ file="icon-shop.png"; x=285; y=405; w=92; h=92; label="Store" },
  [pscustomobject]@{ file="icon-settings.png"; x=405; y=405; w=92; h=92; label="Settings" },
  [pscustomobject]@{ file="icon-hint.png"; x=525; y=405; w=92; h=92; label="Hint" },
  [pscustomobject]@{ file="coin-layer.png"; x=680; y=405; w=92; h=92; label="Layer Coin" },
  [pscustomobject]@{ file="coin-hint.png"; x=800; y=405; w=92; h=92; label="Hint Coin" },
  [pscustomobject]@{ file="reward-double-bg.png"; x=950; y=390; w=390; h=74; label="2x Button Bg" },
  [pscustomobject]@{ file="button-hint.png"; x=950; y=565; w=390; h=150; label="Hint Button" }
)

foreach ($item in $previewItems) {
  $img = [System.Drawing.Image]::FromFile((Join-Path $outDir $item.file))
  $g.DrawImage($img, $item.x, $item.y, $item.w, $item.h)
  $g.DrawString($item.label, $labelFont, $light, $item.x, ($item.y + $item.h + 14))
  $img.Dispose()
}
$titleFont.Dispose(); $labelFont.Dispose(); $dark.Dispose(); $light.Dispose()
Save-Art $preview "a-realistic-preview.png"
