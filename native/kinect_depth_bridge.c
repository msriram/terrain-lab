#include <libfreenect_sync.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SOURCE_WIDTH 640
#define SOURCE_HEIGHT 480
#define OUTPUT_WIDTH 640
#define OUTPUT_HEIGHT 480

static volatile sig_atomic_t running = 1;

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

int main(void) {
    signal(SIGINT, stop_running);
    signal(SIGTERM, stop_running);
    setvbuf(stdout, NULL, _IONBF, 0);

    uint16_t output[OUTPUT_WIDTH * OUTPUT_HEIGHT];
    uint32_t frame_number = 0;

    fprintf(stderr, "Waiting for Kinect v1 depth frames...\n");
    while (running) {
        void *raw = NULL;
        uint32_t timestamp = 0;
        int result = freenect_sync_get_depth(
            &raw, &timestamp, 0, FREENECT_DEPTH_MM
        );
        if (result < 0 || raw == NULL) {
            fprintf(stderr, "Unable to read Kinect depth. Is another app using it?\n");
            freenect_sync_stop();
            return 2;
        }

        const uint16_t *depth = (const uint16_t *)raw;
        memcpy(output, depth, sizeof(output));

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
        if (!write_all(header, sizeof(header)) || !write_all(output, sizeof(output))) break;
        ++frame_number;
    }

    freenect_sync_stop();
    return 0;
}
