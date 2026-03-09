import { useCallback, useEffect, useRef, useState } from 'react'
import { type Settings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings'

const DEBOUNCE_MS = 300
const SAVED_INDICATOR_MS = 1500
const OPACITY_STEP = 0.05
const OPACITY_MIN = 0
const OPACITY_MAX = 1
const FONT_SIZE_MIN = 8
const FONT_SIZE_MAX = 32
const PADDING_MIN = 0
const PADDING_MAX = 16

export default function App() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [loaded, setLoaded] = useState(false)
    const [saved, setSaved] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>()
    const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

    useEffect(() => {
        loadSettings().then((s) => {
            setSettings(s)
            setLoaded(true)
        })
    }, [])

    const persist = useCallback((updated: Settings) => {
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            saveSettings(updated).then(() => {
                setSaved(true)
                clearTimeout(savedTimerRef.current)
                savedTimerRef.current = setTimeout(() => setSaved(false), SAVED_INDICATOR_MS)
            })
        }, DEBOUNCE_MS)
    }, [])

    const update = useCallback(
        (partial: Partial<Settings>) => {
            setSettings((prev) => {
                const next = { ...prev, ...partial }
                persist(next)
                return next
            })
        },
        [persist],
    )

    if (!loaded) return null

    return (
        <div className="max-w-lg mx-auto p-8">
            <div className="flex items-center justify-between pb-6">
                <h1 className="text-2xl font-bold text-gray-900">Link Hinter Options</h1>
                {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
            </div>

            <div className="space-y-5">
                <Field label="Activation Hotkey">
                    <input
                        type="text"
                        value={settings.hotkey}
                        maxLength={1}
                        onChange={(e) => update({ hotkey: e.target.value })}
                        className="w-16 text-center"
                    />
                </Field>

                <Field label="Hint Characters">
                    <input
                        type="text"
                        value={settings.charset}
                        onChange={(e) => update({ charset: e.target.value })}
                        className="w-full"
                    />
                </Field>

                <Field label="Hint Background">
                    <ColorInput
                        value={settings.hintBackground}
                        onChange={(v) => update({ hintBackground: v })}
                    />
                </Field>

                <Field label="Hint Text Color">
                    <ColorInput
                        value={settings.hintText}
                        onChange={(v) => update({ hintText: v })}
                    />
                </Field>

                <Field label="Matched Character Color">
                    <ColorInput
                        value={settings.matchColor}
                        onChange={(v) => update({ matchColor: v })}
                    />
                </Field>

                <Field label="Font Size (px)">
                    <input
                        type="number"
                        value={settings.hintFontSize}
                        min={FONT_SIZE_MIN}
                        max={FONT_SIZE_MAX}
                        onChange={(e) => update({ hintFontSize: e.target.valueAsNumber })}
                        className="w-24"
                    />
                </Field>

                <Field label="Padding (px)">
                    <input
                        type="number"
                        value={settings.hintPadding}
                        min={PADDING_MIN}
                        max={PADDING_MAX}
                        onChange={(e) => update({ hintPadding: e.target.valueAsNumber })}
                        className="w-24"
                    />
                </Field>

                <Field label="Opacity">
                    <input
                        type="number"
                        value={settings.hintOpacity}
                        min={OPACITY_MIN}
                        max={OPACITY_MAX}
                        step={OPACITY_STEP}
                        onChange={(e) => update({ hintOpacity: e.target.valueAsNumber })}
                        className="w-24"
                    />
                </Field>

                <Field label="Font Family">
                    <input
                        type="text"
                        value={settings.hintFontFamily}
                        onChange={(e) => update({ hintFontFamily: e.target.value })}
                        className="w-full"
                    />
                </Field>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700 shrink-0">{label}</span>
            {children}
        </label>
    )
}

function ColorInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-8 cursor-pointer rounded border border-gray-300"
            />
            <span className="text-sm text-gray-500 font-mono">{value}</span>
        </div>
    )
}
