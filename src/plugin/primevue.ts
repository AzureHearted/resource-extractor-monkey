import PrimeVue from "primevue/config";
import type { PrimeVueConfiguration } from "primevue/config";
import Aura from "@primeuix/themes/aura";

const configPrimeVue: PrimeVueConfiguration = {
	theme: {
		preset: Aura,
		options: {
			prefix: "wc2",
			darkModeSelector: "system",
			cssLayer: true,
		},
	},
	// ripple: true,
};
import "primeicons/primeicons.css";

export { PrimeVue, configPrimeVue };