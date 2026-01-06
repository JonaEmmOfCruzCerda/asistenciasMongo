'use client';

import { useState, useEffect } from "react";

export default function AttendanceClock() {
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();

            // 1. Formatear hora (se mantiene igual)
            const timeString = now.toLocaleTimeString('es-MX', {
                timeZone: 'America/Mexico_City',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            const dateString = now.toLocaleDateString('es-MX', {
                timeZone: 'America/Mexico_City',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            setCurrentTime(timeString);
            setCurrentDate(dateString);
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-2 mb-6">
            <div className="inline-block px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl shadow-sm">
                <div className="text-3xl font-mono font-bold text-gray-800 tracking-tight">{currentTime}</div>
                <div className="text-sm text-gray-600 font-medium capitalize">{currentDate}</div>
            </div>
        </div>
    );
}
