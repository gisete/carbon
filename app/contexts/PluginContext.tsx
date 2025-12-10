"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type PluginType = 'weather' | 'calendar' | 'system' | null;

interface PluginContextType {
	selectedPlugin: PluginType;
	setSelectedPlugin: (plugin: PluginType) => void;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export function PluginProvider({ children }: { children: ReactNode }) {
	const [selectedPlugin, setSelectedPlugin] = useState<PluginType>(null);

	return (
		<PluginContext.Provider value={{ selectedPlugin, setSelectedPlugin }}>
			{children}
		</PluginContext.Provider>
	);
}

export function usePlugin() {
	const context = useContext(PluginContext);
	if (context === undefined) {
		throw new Error("usePlugin must be used within a PluginProvider");
	}
	return context;
}
