document.addEventListener("DOMContentLoaded", function () {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		var currentTab = tabs[0];
		var actionButton = document.getElementById("actionButton");
		var downloadCsvButton = document.getElementById("downloadCsvButton");
		var resultsTable = document.getElementById("resultsTable");
		var filenameInput = document.getElementById("filenameInput");
		// && currentTab.url.includes("://www.google.com/maps/search")
		if (currentTab) {
			document.getElementById("message").textContent =
				"Let's scrape Google Maps!";
			actionButton.disabled = false;
			actionButton.classList.add("enabled");
		} else {
			var messageElement = document.getElementById("message");
			messageElement.innerHTML = "";
			var linkElement = document.createElement("a");
			linkElement.href = "https://www.google.com/maps/search/";
			linkElement.textContent = "Go to Google Maps Search.";
			linkElement.target = "_blank";
			messageElement.appendChild(linkElement);

			actionButton.style.display = "none";
			downloadCsvButton.style.display = "none";
			filenameInput.style.display = "none";
		}

		actionButton.addEventListener("click", function () {
			console.log("actionButton HIT!");
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				function: scrapeData
			});
		});

		downloadCsvButton.addEventListener("click", function () {
			console.log("downloadCsvButton HIT!");
			var filename = filenameInput.value.trim();
			if (filename.length > 2) {
				chrome.scripting.executeScript({
					target: { tabId: currentTab.id },
					args: [filename],
					function: downloadCurrentIDBData
				});
			} else {
				alert("Enter a valid Filename for CSV");
			}
		});
	});
});

var downloadCurrentIDBData = async (filename) => {
	// Function to download the CSV file
	const download = (filename, data) => {
		// Create a Blob with the CSV data and type
		const blob = new Blob([data], { type: "text/csv" });

		// Create a URL for the Blob
		const url = URL.createObjectURL(blob);

		// Create an anchor tag for downloading
		const a = document.createElement("a");

		// Set the URL and download attribute of the anchor tag
		a.href = url;
		a.download = filename + ".csv";

		// Trigger the download by clicking the anchor tag
		a.click();
	};

	// Function to create a CSV string from an object
	const csvmaker = (dataList) => {
		// Get the keys (headers) of the object
		const headers = Object.keys(dataList[0]);
		console.log("headers", headers);
		var listValues = [headers.join(",")];

		for (var item in dataList) {
			// Get the values of the object
			const values = Object.values(dataList[item]);
			listValues.push('"' + values.join('","') + '"');
		}

		console.log("listValues", listValues);
		// Join the headers and values with commas and newlines to create the CSV string
		return listValues.join("\n");
	};

	var db;
	const DB_STORE_NAME = "places";
	console.log("downloadCurrentIDBData Started");

	function getObjectStore(store_name, mode) {
		var tx = db.transaction(store_name, mode);
		return tx.objectStore(store_name);
	}

	const request = window.indexedDB.open("OZLleads", 1);
	request.onerror = (event) => {
		// Do something with request.error!
	};

	request.onupgradeneeded = async (event) => {
		console.log("running onupgradeneeded");
		db = event.target.result;
		if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
			var store = db.createObjectStore(DB_STORE_NAME, {
				keyPath: "id",
				autoIncrement: true
			});
			store.createIndex("title", "title", { unique: true });
			store.createIndex("address", "address", { unique: false });
		}
	};

	request.onsuccess = async (event) => {
		// Do something with request.result!
		db = event.target.result;
		db.onerror = (event) => {
			// Generic error handler for all errors targeted at this database's
			// requests!
			console.error("Database error: ", event.target.error?.message);
		};
		var placesObjectStore = getObjectStore(DB_STORE_NAME, "readonly");
		let cursorRequest = placesObjectStore.openCursor();

		var dataList = [];

		cursorRequest.onsuccess = async (event) => {
			let cursor = event.target.result;
			if (cursor) {
				let task = cursor.value;
				// Display the task in the UI
				console.log(task);
				dataList.push(task);

				// Move to the next record
				await cursor.continue();
			} else {
				console.log("No more entries!");
				console.log(dataList);
				if (dataList.length > 0) {
					// Create the CSV string from the data
					const csvdata = csvmaker(dataList);

					// Download the CSV file
					download(filename, csvdata);
				}
			}
		};
	};
	return true;
};

var scrapeData = async () => {
	function randomInteger(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	const timer = (ms) => new Promise((res) => setTimeout(res, ms));

	function getData(nodelist) {
		var datalist = [];
		for (var k = 0; k < nodelist.length; k++) {
			var data = nodelist[k].innerText;
			var dataSplitted = data.split("\n");
			for (var s = 0; s < dataSplitted.length; s++) {
				if (dataSplitted[s].length > 3) {
					datalist.push(dataSplitted[s]);
				}
			}
		}
		return datalist;
	}

	var links = Array.from(
		document.querySelectorAll(
			'a[href^="https://www.google.com/maps/place"]'
		)
	);

	const DB_STORE_NAME = "places";

	var places = [];

	var db;

	function getObjectStore(store_name, mode) {
		var tx = db.transaction(store_name, mode);
		return tx.objectStore(store_name);
	}

	const request = window.indexedDB.open("OZLleads", 1);
	request.onerror = (event) => {
		// Do something with request.error!
	};

	request.onupgradeneeded = async (event) => {
		console.log("running onupgradeneeded");
		db = event.target.result;
		if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
			var store = db.createObjectStore(DB_STORE_NAME, {
				keyPath: "id",
				autoIncrement: true
			});
			store.createIndex("title", "title", { unique: true });
			store.createIndex("address", "address", { unique: false });
		}
	};

	request.onsuccess = async (event) => {
		// Do something with request.result!
		db = event.target.result;
		db.onerror = (event) => {
			// Generic error handler for all errors targeted at this database's
			// requests!
			console.error("Database error: ", event.target.error?.message);
		};

		for await (const link of links) {
			var container = link.closest('[jsaction*="mouseover:pane"]');
			var titleText = container
				? container.querySelector(".fontHeadlineSmall").textContent
				: "";
			console.log(container.children[0]);
			var rating = "";
			var reviewCount = "";
			var phone = "";
			var industry = "";
			var address = "";
			var companyUrl = "";

			container.children[0].click();
			await timer(randomInteger(3000, 4000));
			var info = document.querySelectorAll("div.Io6YTe");
			var datalist = getData(info);
			address = datalist.join("|");
			for (l = 0; l < datalist.length; l++) {
				if (datalist[l].indexOf("+6") != -1) {
					phone = datalist[l];
				}
			}
			document.querySelectorAll("button.VfPpkd-icon-LgbsSe")[0].click();
			await timer(randomInteger(1000, 2000));
			var place = {
				title: titleText,
				// rating: rating,
				// reviewCount: reviewCount,
				// phone: phone,
				// industry: industry,
				address: address
				// companyUrl: companyUrl,
				// href: link.href
			};
			places.push(place);
			console.log(JSON.stringify(place, undefined, 4));
			var store = getObjectStore(DB_STORE_NAME, "readwrite");
			let addRequest = store.add(place);

			addRequest.onsuccess = function (event) {
				// Data added successfully
				console.log("Saved!");
			};
			addRequest.onerror = function (error) {
				console.log(error);
			};
		}
	};

	// Return the data as an object
	return places;
};
