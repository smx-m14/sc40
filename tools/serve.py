"""Servidor local para probar el juego SIN caché: cada recarga usa siempre los ficheros recién generados.
Uso (desde la raíz del proyecto):  python tools/serve.py   →  http://127.0.0.1:8040
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    # El juego son más de 30 módulos que el navegador pide a la vez: con la cola por defecto (5)
    # algunas conexiones se rechazaban y la página se quedaba en negro.
    request_queue_size = 256
    daemon_threads = True


if __name__ == '__main__':
    print('Super Cait\'s 40 en http://127.0.0.1:8040 (sin caché)')
    Server(('127.0.0.1', 8040), NoCache).serve_forever()
