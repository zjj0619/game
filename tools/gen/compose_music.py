#!/usr/bin/env python3
"""Compose original MIDI themes (pentatonic / folk modes) → FluidSynth → loopable MP3/OGG.
Original compositions for 烛龙纪·长夜山海. SoundFont: FluidR3_GM (GPL).
"""
from __future__ import annotations
import math, os, random, subprocess, tempfile
from pathlib import Path
from mido import Message, MidiFile, MidiTrack, MetaMessage, bpm2tempo

OUT = Path(__file__).resolve().parents[2] / 'app' / 'public' / 'assets' / 'music'
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TPB = 480  # ticks per beat

# GM programs
HARP, PIZZ, FLUTE, PAN, STRINGS, CHOIR, NYLON, KOTO = 46, 45, 73, 75, 48, 52, 24, 107
FINGER_BASS, SYN_PAD, ATMOS, CALIOPE, BRIGHT = 33, 89, 99, 82, 1
TAIKO, MELOTOM, WOODBLK = 116, 117, 115  # percussion channel uses notes

PENTA = [0, 2, 4, 7, 9]
MINOR_P = [0, 3, 5, 7, 10]
DARK = [0, 1, 5, 7, 8]
MYST = [0, 2, 3, 7, 8]

def deg(root, mode, i):
    L = len(mode)
    return root + 12 * (i // L) + mode[i % L]

def note_on(tr, note, vel, dt):
    tr.append(Message('note_on', note=max(24, min(108, note)), velocity=max(1, min(127, vel)), time=dt))
def note_off(tr, note, dt):
    tr.append(Message('note_off', note=max(24, min(108, note)), velocity=0, time=dt))

def add_meta(tr, bpm, name=''):
    tr.append(MetaMessage('set_tempo', tempo=bpm2tempo(bpm), time=0))
    if name:
        tr.append(MetaMessage('track_name', name=name, time=0))

def chord_tones(root, mode, degree, voicing=(0, 2, 4)):
    return [deg(root, mode, degree + v) for v in voicing]

def write_theme(path: Path, spec: dict):
    """spec: bpm, bars, root, mode, melody_prog, pad_prog, bass_prog, style"""
    rng = random.Random(spec.get('seed', 42))
    bpm = spec['bpm']
    bars = spec['bars']
    root = spec['root']
    mode = spec['mode']
    style = spec.get('style', 'ambient')  # ambient|battle|boss|warm|dark
    mid = MidiFile(ticks_per_beat=TPB)

    # Track 0: melody
    mel = MidiTrack(); mid.tracks.append(mel)
    add_meta(mel, bpm, 'melody')
    mel.append(Message('program_change', program=spec.get('melody_prog', HARP), time=0))
    mel.append(Message('control_change', control=7, value=spec.get('mel_vol', 95), time=0))

    # Track 1: pad/harmony
    pad = MidiTrack(); mid.tracks.append(pad)
    pad.append(MetaMessage('track_name', name='pad', time=0))
    pad.append(Message('program_change', program=spec.get('pad_prog', STRINGS), time=0))
    pad.append(Message('control_change', control=7, value=spec.get('pad_vol', 55), time=0))

    # Track 2: bass
    bass = MidiTrack(); mid.tracks.append(bass)
    bass.append(MetaMessage('track_name', name='bass', time=0))
    bass.append(Message('program_change', program=spec.get('bass_prog', FINGER_BASS), time=0))
    bass.append(Message('control_change', control=7, value=spec.get('bass_vol', 70), time=0))

    # Track 3: percussion (channel 9)
    perc = MidiTrack(); mid.tracks.append(perc)
    perc.append(MetaMessage('track_name', name='perc', time=0))
    # channel 9 = index 9 in mido (0-based)
    def p_on(note, vel, dt):
        perc.append(Message('note_on', note=note, velocity=vel, time=dt, channel=9))
    def p_off(note, dt):
        perc.append(Message('note_off', note=note, velocity=0, time=dt, channel=9))

    # Progression of scale degrees per bar
    if style in ('battle', 'boss'):
        prog = [0, 0, 3, 4, 0, 2, 3, 4] * ((bars + 7) // 8)
    elif style == 'dark':
        prog = [0, 0, 1, 4, 0, 3, 1, 4] * ((bars + 7) // 8)
    else:
        prog = [0, 2, 4, 2, 0, 3, 4, 2] * ((bars + 7) // 8)
    prog = prog[:bars]

    # Build events as absolute-tick lists then convert
    # Simpler: sequential write with rests

    beat = TPB
    # Pad: whole-bar chords
    pad_dt_pending = 0
    for bi, deg0 in enumerate(prog):
        notes = chord_tones(root - 12, mode, deg0, (0, 2, 4))
        # stagger slightly
        for j, n in enumerate(notes):
            note_on(pad, n, 40 + j * 4, pad_dt_pending if j == 0 else 0)
            pad_dt_pending = 0
        # hold almost full bar
        hold = beat * 4 - 20
        for j, n in enumerate(notes):
            note_off(pad, n, hold if j == 0 else 0)
            hold = 0
        pad_dt_pending = 20  # tiny gap

    # Bass: half notes
    bass_pending = 0
    for bi, deg0 in enumerate(prog):
        n = deg(root - 24, mode, deg0)
        for half in range(2):
            note_on(bass, n if half == 0 else deg(root - 24, mode, deg0 + (2 if style != 'dark' else 1)),
                    75 if half == 0 else 55, bass_pending)
            bass_pending = 0
            note_off(bass, n if half == 0 else deg(root - 24, mode, deg0 + 2), beat * 2 - 10)
            bass_pending = 10

    # Melody patterns
    mel_pending = 0
    motifs = {
        'ambient': [[0, 2, 4, 2], [4, 2, 0, -1], [0, 2, 3, 4], [2, 0, 2, 4]],
        'warm': [[0, 2, 4, 7], [4, 2, 0, 2], [0, 4, 2, 0], [2, 4, 5, 4]],
        'battle': [[0, 0, 4, 2], [4, 4, 2, 0], [0, 2, 4, 5], [3, 2, 0, 0]],
        'boss': [[0, 1, 4, 5], [4, 0, 4, 1], [0, 4, 7, 5], [4, 1, 0, 0]],
        'dark': [[0, 1, 0, 4], [4, 3, 1, 0], [0, 4, 5, 4], [1, 0, 1, 4]],
        'dream': [[4, 2, 0, 2], [7, 4, 2, 0], [0, 2, 4, 7], [5, 4, 2, 4]],
    }
    mset = motifs.get(style, motifs['ambient'])

    for bi, deg0 in enumerate(prog):
        motif = mset[bi % len(mset)]
        # sometimes rest first half of bar for space
        if style in ('ambient', 'dream', 'warm', 'dark') and bi % 4 == 3:
            mel_pending += beat * 4
            continue
        step = beat if style in ('battle', 'boss') else beat  # quarter notes
        if style in ('ambient', 'dream'):
            step = beat  # quarters
        for ki, md in enumerate(motif):
            n = deg(root, mode, deg0 + md) + (12 if style in ('battle', 'boss') else 0)
            vel = 70 + rng.randint(-8, 12)
            if style == 'dream':
                vel = 55 + rng.randint(0, 15)
            note_on(mel, n, vel, mel_pending)
            mel_pending = 0
            dur = step - 30
            # ornament: grace on battle
            if style in ('battle', 'boss') and ki % 2 == 0 and rng.random() < 0.35:
                note_off(mel, n, dur // 2)
                n2 = n + 2
                note_on(mel, n2, vel - 10, 0)
                note_off(mel, n2, dur - dur // 2)
            else:
                note_off(mel, n, dur)
            mel_pending = 30
        # if motif shorter than bar, rest
        used = len(motif) * step
        if used < beat * 4:
            mel_pending += beat * 4 - used

    # Percussion
    perc_pending = 0
    for bi in range(bars):
        if style in ('battle', 'boss'):
            # kick on 1,3 snare on 2,4 hats
            pattern = [
                (36, 100, 0), (42, 50, beat // 2),  # kick + hat
                (38, 90, beat // 2), (42, 40, beat // 2),  # snare
                (36, 85, beat // 2), (42, 50, beat // 2),
                (38, 95, beat // 2), (42, 40, beat // 2),
            ]
            if style == 'boss':
                pattern[0] = (36, 110, 0)
                # add taiko-ish low tom every 2 bars
            first = True
            for note, vel, dt in pattern:
                p_on(note, vel, perc_pending if first else dt)
                first = False
                perc_pending = 0
                p_off(note, 40)
                perc_pending = max(0, dt - 40) if dt else 0
            # fix remaining - rewrite simpler
        elif style == 'warm' and bi % 2 == 0:
            p_on(54, 40, perc_pending)  # tambourine
            perc_pending = 0
            p_off(54, beat * 2)
            perc_pending = beat * 2
        elif style == 'dark' and bi % 4 == 0:
            p_on(41, 55, perc_pending)  # low tom
            perc_pending = 0
            p_off(41, beat * 4)
            perc_pending = 0
        else:
            perc_pending += beat * 4

    # Fix percussion for battle with cleaner rewrite
    if style in ('battle', 'boss'):
        # clear perc track except name
        del perc[1:]
        t = 0
        events = []  # (abs_tick, on/off, note, vel)
        for bi in range(bars):
            base = bi * beat * 4
            kicks = [0, 2] if style == 'battle' else [0, 1.5, 2.5]
            snares = [1, 3]
            for k in kicks:
                events.append((base + int(k * beat), 1, 36, 105 if style == 'boss' else 95))
                events.append((base + int(k * beat) + 80, 0, 36, 0))
            for s in snares:
                events.append((base + int(s * beat), 1, 38, 90))
                events.append((base + int(s * beat) + 60, 0, 38, 0))
            for h in range(8):
                events.append((base + h * (beat // 2), 1, 42, 35 + (10 if h % 2 == 0 else 0)))
                events.append((base + h * (beat // 2) + 30, 0, 42, 0))
            if style == 'boss' and bi % 2 == 0:
                events.append((base, 1, 45, 80))  # mid tom
                events.append((base + 100, 0, 45, 0))
        events.sort(key=lambda x: (x[0], x[1]))
        cur = 0
        for abs_t, on, note, vel in events:
            dt = abs_t - cur
            if on:
                perc.append(Message('note_on', note=note, velocity=vel, time=dt, channel=9))
            else:
                perc.append(Message('note_off', note=note, velocity=0, time=dt, channel=9))
            cur = abs_t

    mid.save(path)
    return path

THEMES = {
    'theme_title': dict(bpm=56, bars=16, root=62, mode=PENTA, style='ambient',
        melody_prog=HARP, pad_prog=CHOIR, bass_prog=NYLON, seed=101, mel_vol=90, pad_vol=50),
    'theme_hub': dict(bpm=64, bars=16, root=65, mode=PENTA, style='warm',
        melody_prog=FLUTE, pad_prog=STRINGS, bass_prog=NYLON, seed=202, mel_vol=85, pad_vol=48),
    'theme_battle': dict(bpm=128, bars=16, root=57, mode=MINOR_P, style='battle',
        melody_prog=KOTO, pad_prog=SYN_PAD, bass_prog=FINGER_BASS, seed=303, mel_vol=100, pad_vol=45, bass_vol=85),
    'theme_boss': dict(bpm=140, bars=16, root=52, mode=DARK, style='boss',
        melody_prog=BRIGHT, pad_prog=ATMOS, bass_prog=FINGER_BASS, seed=404, mel_vol=105, pad_vol=55, bass_vol=90),
    'theme_dream': dict(bpm=48, bars=12, root=69, mode=MYST, style='dream',
        melody_prog=PAN, pad_prog=CHOIR, bass_prog=NYLON, seed=505, mel_vol=70, pad_vol=60),
    'theme_win': dict(bpm=72, bars=8, root=67, mode=PENTA, style='warm',
        melody_prog=HARP, pad_prog=STRINGS, bass_prog=NYLON, seed=606, mel_vol=95, pad_vol=55),
    'theme_jincheng': dict(bpm=60, bars=12, root=60, mode=MINOR_P, style='dark',
        melody_prog=KOTO, pad_prog=ATMOS, bass_prog=NYLON, seed=701),
    'theme_qingqiu': dict(bpm=72, bars=12, root=67, mode=PENTA, style='warm',
        melody_prog=FLUTE, pad_prog=STRINGS, bass_prog=NYLON, seed=702),
    'theme_donghai': dict(bpm=58, bars=12, root=64, mode=PENTA, style='ambient',
        melody_prog=PAN, pad_prog=CHOIR, bass_prog=NYLON, seed=703),
    'theme_kunlun': dict(bpm=54, bars=12, root=69, mode=PENTA, style='ambient',
        melody_prog=HARP, pad_prog=CHOIR, bass_prog=NYLON, seed=704, pad_vol=62),
    'theme_beihai': dict(bpm=50, bars=12, root=62, mode=MYST, style='dark',
        melody_prog=PAN, pad_prog=ATMOS, bass_prog=NYLON, seed=705),
    'theme_guixu': dict(bpm=46, bars=12, root=55, mode=DARK, style='dark',
        melody_prog=ATMOS, pad_prog=CHOIR, bass_prog=FINGER_BASS, seed=706, mel_vol=60, pad_vol=70),
    'theme_ending': dict(bpm=66, bars=12, root=65, mode=PENTA, style='warm',
        melody_prog=HARP, pad_prog=STRINGS, bass_prog=NYLON, seed=807, mel_vol=88, pad_vol=58),
    'theme_sad': dict(bpm=52, bars=12, root=60, mode=MINOR_P, style='dark',
        melody_prog=FLUTE, pad_prog=CHOIR, bass_prog=NYLON, seed=808, mel_vol=75, pad_vol=55),
    'theme_final': dict(bpm=148, bars=16, root=50, mode=MYST, style='boss',
        melody_prog=KOTO, pad_prog=ATMOS, bass_prog=FINGER_BASS, seed=909, mel_vol=110, pad_vol=60, bass_vol=95),
}

def render(mid_path: Path, wav_path: Path):
    subprocess.check_call([
        'fluidsynth', '-ni', '-g', '0.6', '-F', str(wav_path), '-r', '44100',
        SF2, str(mid_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def trim_silence(wav_in: Path, wav_out: Path, pad_ms=80):
    # use ffmpeg silenceremove + pad for loop seam
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav_in),
        '-af', f'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-50dB,'
               f'areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-50dB,areverse,'
               f'afade=t=in:st=0:d=0.08,afade=t=out:st=0:d=0.12',
        '-ar', '44100', '-ac', '2', str(wav_out)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def encode(wav: Path, stem: Path):
    mp3 = stem.with_suffix('.mp3')
    ogg = stem.with_suffix('.ogg')
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-q:a', '3', str(mp3)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav), '-codec:a', 'libvorbis', '-q:a', '5', str(ogg)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return mp3, ogg

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='zlj_music_'))
    results = []
    for name, spec in THEMES.items():
        mid = work / f'{name}.mid'
        wav_raw = work / f'{name}_raw.wav'
        wav = work / f'{name}.wav'
        print(f'compose {name}...')
        write_theme(mid, spec)
        render(mid, wav_raw)
        # simpler trim: take measured duration from tempo
        bars = spec['bars']
        bpm = spec['bpm']
        dur = bars * 4 * 60 / bpm
        # cut to exact loop length with fades
        subprocess.check_call([
            'ffmpeg', '-y', '-i', str(wav_raw), '-t', f'{dur:.3f}',
            '-af', f'afade=t=in:st=0:d=0.05,afade=t=out:st={max(0,dur-0.15):.3f}:d=0.15',
            '-ar', '44100', '-ac', '2', str(wav)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        mp3, ogg = encode(wav, OUT / name)
        # also keep midi for attribution/source
        mid_out = OUT / f'{name}.mid'
        mid_out.write_bytes(mid.read_bytes())
        results.append((name, mp3.stat().st_size, ogg.stat().st_size, dur))
        print(f'  -> {mp3.name} {mp3.stat().st_size//1024}KB / {ogg.name} {ogg.stat().st_size//1024}KB ({dur:.1f}s)')
    print('DONE', len(results), 'themes →', OUT)
    # cleanup large wavs
    import shutil
    shutil.rmtree(work, ignore_errors=True)

if __name__ == '__main__':
    main()
