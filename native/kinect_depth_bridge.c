#include <libfreenect.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define SOURCE_WIDTH 640
#define SOURCE_HEIGHT 480
static volatile sig_atomic_t running = 1;
static volatile sig_atomic_t output_broken = 0;
static uint32_t frame_number = 0;

static void stop_running(int signal_number) {
    (void)signal_number;
    running = 0;
}

static int write_all(const void *data, size_t size) {
    const unsigned char *cursor = (const unsigned char *)data;
    while (size > 0) {
        size_t written = fwrite(cursor, 1, size, stdout);
        if (written == 0) return 0;
        cursor += written;
        size -= written;
    }
    return fflush(stdout) == 0;
}

/* The event-driven API lets SIGTERM be handled between short USB event waits.
 * The device is therefore closed cleanly before another app tries to reopen it. */
static void depth_callback(freenect_device *device, void *depth, uint32_t timestamp) {
    (void)device;
    const unsigned char header[12] = {
        'K', 'D', 'E', 'P',
        (unsigned char)(frame_number),
        (unsigned char)(frame_number >> 8),
        (unsigned char)(frame_number >> 16),
        (unsigned char)(frame_number >> 24),
        (unsigned char)(timestamp),
        (unsigned char)(timestamp >> 8),
        (unsigned char)(timestamp >> 16),
        (unsigned char)(timestamp >> 24)
    };
    if (!write_all(header, sizeof(header)) ||
        !write_all(depth, SOURCE_WIDTH * SOURCE_HEIGHT * sizeof(uint16_t))) {
        output_broken = 1;
        running = 0;
        return;
    }
    ++frame_number;
}

int main(void) {
    freenect_context *context = NULL;
    freenect_device *device = NULL;
    int exit_code = 1;

    signal(SIGINT, stop_running);
    signal(SIGTERM, stop_running);
    signal(SIGPIPE, SIG_IGN);
    setvbuf(stdout, NULL, _IONBF, 0);

    fprintf(stderr, "Opening Kinect v1 depth stream...\n");
    if (freenect_init(&context, NULL) < 0) {
        fprintf(stderr, "Unable to initialize libfreenect.\n");
        goto cleanup;
    }
    freenect_select_subdevices(context, FREENECT_DEVICE_CAMERA);
    if (freenect_num_devices(context) < 1) {
        fprintf(stderr, "No Kinect v1 device found.\n");
        goto cleanup;
    }
    if (freenect_open_device(context, &device, 0) < 0) {
        fprintf(stderr, "Unable to open Kinect depth camera. Is another app using it?\n");
        goto cleanup;
    }
    freenect_set_depth_mode(device, freenect_find_depth_mode(
        FREENECT_RESOLUTION_MEDIUM, FREENECT_DEPTH_MM));
    freenect_set_depth_callback(device, depth_callback);
    if (freenect_start_depth(device) < 0) {
        fprintf(stderr, "Unable to start Kinect depth stream.\n");
        goto cleanup;
    }

    exit_code = 0;
    while (running) {
        struct timeval timeout = {.tv_sec = 0, .tv_usec = 100000};
        if (freenect_process_events_timeout(context, &timeout) < 0) {
            fprintf(stderr, "Kinect USB event stream stopped.\n");
            exit_code = 2;
            break;
        }
    }

cleanup:
    if (device) {
        freenect_stop_depth(device);
        freenect_close_device(device);
    }
    if (context) freenect_shutdown(context);
    return output_broken ? 0 : exit_code;
}
