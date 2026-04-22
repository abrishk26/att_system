import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimePickerProps {
    date?: Date
    setDate: (date: Date) => void
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            const currentHours = date ? date.getHours() : new Date().getHours()
            const currentMinutes = date ? date.getMinutes() : new Date().getMinutes()
            newDate.setHours(currentHours)
            newDate.setMinutes(currentMinutes)
            setSelectedDate(newDate)
            setDate(newDate)
        }
    }

    const handleTimeChange = (type: "hours" | "minutes", value: string) => {
        if (selectedDate) {
            const newDate = new Date(selectedDate)
            if (type === "hours") {
                newDate.setHours(parseInt(value))
            } else {
                newDate.setMinutes(parseInt(value))
            }
            setSelectedDate(newDate)
            setDate(newDate)
        }
    }

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl border-slate-200",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP HH:mm") : <span>Pick a date and time</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t border-border flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-1">
                        <Select
                            value={selectedDate?.getHours().toString().padStart(2, "0")}
                            onValueChange={(v) => handleTimeChange("hours", v)}
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                                {hours.map((h) => (
                                    <SelectItem key={h} value={h}>
                                        {h}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-slate-400">:</span>
                        <Select
                            value={selectedDate?.getMinutes().toString().padStart(2, "0")}
                            onValueChange={(v) => handleTimeChange("minutes", v)}
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent>
                                {minutes.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
