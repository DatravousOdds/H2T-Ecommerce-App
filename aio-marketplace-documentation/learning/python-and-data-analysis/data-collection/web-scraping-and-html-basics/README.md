---
icon: spider-web
cover: >-
  https://images.unsplash.com/photo-1669030282983-4a381604157c?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHw5fHx3ZWIlMjBzY3JhcGluZ3xlbnwwfHx8fDE3NTA3MzQ0MDR8MA&ixlib=rb-4.1.0&q=85
coverY: 0
---

# Web Scraping and HTML Basics

## What is Web Scraping?

Web scraping allows you to collect data from varies website, and return the html structure which contains certain data you are looking for. You send out a get request using the request library in python to seek retrieve the website you want, similar to how you would go to a website. Once this is done it will return you with a json response usually containing header tags and body in json format. People use this technique to compare prices on items, retrieve data dynamically etc.

### Extraction

You gather any or specific data you want using python web scraping technique, to do so you usually have to send a request to a website you are trying to get data from and get the response which will return a html structure with the data that you need. There are two libraries that you can use to get the data which is the request, and BeautifulSoup library that Python provides

### Parsing

Once you have gotten a response from the website you are trying to scrape, you must parse the data, to html so that you can retrieve the data you specify need. Parsing mean taking attributes of the HTML structure and getting only the information that you are looking for.

### Transformation

After you have gather the data that you need through parsing, you can clean up the messy to data. To me it look more clean, you can do this be remove certain values, fixing spelling issues, or put into a spreadsheet and clean it up from there.

### Storage

After extracting and parsing the data that you are looking for, you can store that data for later use in you analysis experiment. You can also store this data in a SQL database and retrieve it when needed.



## HTML Structure

* `<html>`  the root element of the html page
* `<head>` the head of the html webpage, usually contains page title, links, css file references
* `<body>` the body tag is usually what you find you primary data, or content for the website
* `<h1>`  there header for the website page and ranges for header 1 - 6 all being different sizes
* `<p>`  the paragraph tags usually hold text or information regarding to a specific topic&#x20;

## Composition of an HTML tag

Each element in the html structure is a unique tag representing a piece of content on the web page

Each tag has a tag name `<a>` represent an anchor tag, and most tags contains an closing tags when in use&#x20;

Tags can contains attributes, value and additional information regarding the tag

## HTML Tree Structure

The html structure should looked at as more of a tree of nodes, where each node contains a descendant or is a sibling to another element in the tree.

Tags can contain other tags, making that tag the tag's children and tags can hol string, text, other tags as well.

A tag with the same parents are know as siblings, for example `<html>` hold the two descendants `<head>` and `<body>` tags, making them children of the parent tag `<html>`&#x20;

<figure><img src="../../../../.gitbook/assets/image (6).png" alt=""><figcaption><p>This is visual representation of the HTML Document Tree Structure</p></figcaption></figure>

## HTML Table

An HTML table organizes data into rows and columns. To create a table, use the `<table>` tag. Tables typically include headers (`<th>`) that serve as column titles. Each row is created with the `<tr>` tag, and data is stored within `<td>` tags, which are children of the `<tr>` tag.

<figure><img src="../../../../.gitbook/assets/image (7).png" alt=""><figcaption><p>Visual Definition of table</p></figcaption></figure>

## Web Scraping

Tools that you need to web scrap in python is beautifSoup and the request library.

```python
# Import BeautifulSoup to parse web content
from bs4 import BeautifulSoup
```

### Fetching and Parsing HTML

To  fetch data from a website, you use the request library to get the content and then use the BeautifulSoup to parse the data into more usable HTML content.

```python
import requests
from bs4 import BeautifulSoup

# Specify the url
url = 'https://en.wikipedia.org/wiki/IBM'
# retrieve the website content
response = requests.get(url)
# return the html text format
html_content = response.text
# parses the website content
soup = BeatifulSoup(html_content, "html.parser")
```

