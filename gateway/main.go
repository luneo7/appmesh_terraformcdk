package main

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/aws/aws-xray-sdk-go/xray"
)

const (
	defaultPort              = "8080"
	xrayDefaultLogLevel      = "warn"
	defaultEnableXrayTracing = true
)

var (
	enableXrayTracing bool
)

func init() {
	if enable, err := strconv.ParseBool(os.Getenv("ENABLE_XRAY_TRACING")); err == nil {
		enableXrayTracing = enable
	} else {
		enableXrayTracing = defaultEnableXrayTracing
	}

	if enableXrayTracing {
		xrayLogLevel := os.Getenv("XRAY_LOG_LEVEL")
		if xrayLogLevel == "" {
			xrayLogLevel = xrayDefaultLogLevel
		}

		xray.Configure(xray.Config{
			LogLevel: xrayLogLevel,
		})
	}
}

// Set SERVER_PORT environment variable to override the default listen port
func getServerPort() string {
	port := os.Getenv("SERVER_PORT")
	if port != "" {
		return port
	}

	return defaultPort
}

func callService(request *http.Request, endpoint string) (string, error) {

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}

	var client *http.Client
	if enableXrayTracing {
		client = xray.Client(&http.Client{})
	} else {
		client = &http.Client{}
	}

	req.Header.Add("Accept", "application/json,text/plain;q=0.9,*/*;q=0.8")

	resp, err := client.Do(req.WithContext(request.Context()))
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", errors.New(string(body))
	}

	response := strings.TrimSpace(string(body))

	return response, nil
}

// /banana

type bananaHandler struct{}

func (h *bananaHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/banana")

	response, err := callService(request, "http://banana.mesh.local:8080"+path)
	if err != nil {
		log.Printf("[Error] calling banana service (%s)", err)
		writer.WriteHeader(http.StatusInternalServerError)
		writer.Write([]byte("500 - Internal Error"))

	}

	writer.Header().Set("Content-Type", "application/json")

	fmt.Fprintf(writer, `%s`, response)
}

// /mango

type mangoHandler struct{}

func (h *mangoHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/mango")

	response, err := callService(request, "http://mango.mesh.local:8080"+path)
	if err != nil {
		log.Printf("[Error] calling mango service (%s)", err)
		writer.WriteHeader(http.StatusInternalServerError)
		writer.Write([]byte("500 - Internal Error"))
		return
	}

	writer.Header().Set("Content-Type", "application/json")

	fmt.Fprintf(writer, `%s`, response)
}

// /ping

type pingHandler struct{}

func (h *pingHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
}

func main() {
	log.Printf("[Info] Starting gateway, listening on port %s", getServerPort())

	var banana http.Handler
	var mango http.Handler
	var ping http.Handler

	if enableXrayTracing {
		xraySegmentNamer := xray.NewFixedSegmentNamer("gateway")
		banana = xray.Handler(xraySegmentNamer, &bananaHandler{})
		mango = xray.Handler(xraySegmentNamer, &mangoHandler{})
		ping = &pingHandler{}
	} else {
		banana = &bananaHandler{}
		mango = &mangoHandler{}
		ping = &pingHandler{}
	}
	http.Handle("/banana", banana)
	http.Handle("/banana/", banana)
	http.Handle("/mango", mango)
	http.Handle("/mango/", mango)
	http.Handle("/health/live", ping)

	log.Fatal(http.ListenAndServe(":"+getServerPort(), nil))
}
