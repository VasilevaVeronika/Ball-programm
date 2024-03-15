function MainBalls(canvas, slider_01, text_01, slider_02, text_02) {

    canvas.onselectstart = function () { return false; };     // запрет выделения canvas

    // Предварительные установки

    var context = canvas.getContext("2d");                  // на context происходит рисование
    canvas.oncontextmenu = function (e) { return false; };    // блокировка контекстного меню

    var Pi = 3.1415926;                 // число "пи"

    var m0 = 1;                         // масштаб массы
    var t0 = 1;                         // масштаб времени (период колебаний исходной системы)
    var a0 = 1;                         // масштаб расстояния (диаметр шара)

    var g0 = a0 / t0 / t0;              // масштаб ускорения (ускорение, при котором за t0 будет пройдено расстояние a0)
    var k0 = 2 * Pi / t0;               // масштаб частоты
    var C0 = m0 * k0 * k0;              // масштаб жесткости
    var B0 = 2 * m0 * k0;               // масштаб вязкости

    // *** Задание физических параметров ***

    var Ny = 5;                         // число шаров, помещающихся по вертикали в окно (задает размер шара относительно размера окна)
    var m = 1 * m0;                     // масса
    var CWall = 10 * C0;                // жесткость стен
    var CBall = 0.1 * CWall;            // жесткость между частицами
    var BVisc = 0.008 * B0;             // вязкость среды
    var BInternal = 0.01 * B0;          // внутреннее трение
    var BWall = 0.03 * B0;              // вязкость на стенках
    var mg = 0.25 * m * g0;             // сила тяжести
    var r = 0.5 * a0;                   // радиус частицы в расчетных координатах
    var K = 0.7;                        // все силы, зависящие от радиуса, ограничиваются значением, реализующимся при r/a = K
    var a = 2 * r;                      // равновесное расстояние между частицами
    var aCut = 2 * a;                   // радиус обрезания
    var TGoalK = 2;                     // целевая температура системы равна TGoalK * D
    var TActualMaxK = 200;              // макимальная температура, при которой работает термостат равна TActualMaxK * D

    // *** Задание вычислительных параметров ***

    var fps = 60;                       // frames per second - число кадров в секунду (качечтво отображения)
    var spf = 100;                      // steps per frame   - число шагов интегрирования между кадрами (скорость расчета)
    var dt = 0.04 * t0 / fps;          // шаг интегрирования (качество расчета)

    // Выполнение программы

    var r2 = r * r;                     // ___в целях оптимизации___
    var a2 = a * a;                     // ___в целях оптимизации___
    var D = a2 * CBall / 72;            // энергия связи между частицами
    var LJCoeff = 12 * D / a2;          // коэффициент для расчета потенциала Л-Дж
    var b = Math.pow(13 / 7, 6) * a;    // коэффициент для SLJ потенциала
    var b2 = b * b;                     // ___в целях оптимизации___
    var SLJDenominator = 1 / (aCut * aCut - b2);    // знаменатель для расчета SLJ потенциала

    var thermostatEnabled = document.getElementById('checkbox_02').checked;     // термостат применяется к вязкости среды
    var addRandomV = document.getElementById('checkbox_03').checked;            // случайные скорости для разгона
    var T0 = 1 * D;                     // масштаб температуры
    var TGoal = TGoalK * T0;            // целевая температура системы
    var TActualMax = TActualMaxK * T0;  // макимальная температура, при которой работает термостатс (для избежания беск. скоростей)
    var TActual = 0;                    // актуальная температура
    var k = 1;                          // постоянную Больцмана примем за единицу
    var Tk = m / k;                     // ___в целях оптимизации___
    var viscFrictionTh = document.getElementById('checkbox_04').checked;        // термостат применяется к вязкости среды
    var internalFrictionTh = document.getElementById('checkbox_05').checked;    // термостат применяется к внутреннему трению
    var TempIntervalID;

    var Ka = K * a;                     // ___в целях оптимизации___
    var K2a2 = K * K * a2;              // ___в целях оптимизации___

    var dNd = null;                     // ссылка на захваченный курсором шар (drag & drop)
    var grad;                           // должен ли работать градиент (регулируется в функции setNy())
    var SLJEnabled = document.getElementById('checkbox_01').checked;

    this.setSlider_01 = function (c) { mg = c * m * g0; }; // функция для слайдера гравитации
    this.setSlider_02 = function (c) { TGoal = c; };       // функция для слайдера термостата
    this.setNy = function (ny) {
        Ny = ny;
        if (Ny > 8) {
            grad = false;                   // градиент не работает, если Ny > 8
            context.fillStyle = "#3070d0";  // цвет, шара
        } else
            grad = true;
    };
    this.setNy(Ny);                         // запускаем с уже присвоенным значением, чтобы обновились настройки градиента
    this.setCheckbox_01 = function (bool) { SLJEnabled = bool; };
    this.setCheckbox_02 = function (bool) {
        thermostatEnabled = bool;
        document.getElementById('checkbox_03').disabled = !bool;
        document.getElementById('checkbox_04').disabled = !bool;
        document.getElementById('checkbox_05').disabled = !bool;
        document.getElementById('slider_02').disabled = !bool;
        document.getElementById('text_02').disabled = !bool;
        if (bool) {
            TempIntervalID = setInterval(   // обновление информации о температуре
                function () { document.getElementById('Temperature').innerHTML = TActual.toFixed(3); }, 1000 / 3);
        }
        else {
            clearInterval(TempIntervalID);  // температура больше не подсчитывается - удаляем обновление информации о ней
            document.getElementById('Temperature').innerHTML = "???"
        }
    };
    this.setCheckbox_02(thermostatEnabled); // запускаем сразу, чтобы обновить состояния элементов интерфейса
    this.setCheckbox_03 = function (bool) { addRandomV = bool; };
    this.setCheckbox_04 = function (bool) { viscFrictionTh = bool; };
    this.setCheckbox_05 = function (bool) { internalFrictionTh = bool; };

    // Настройка интерфейса

    slider_01.min = 0; slider_01.max = 5;
    slider_01.step = 0.05;
    slider_01.value = mg / m / g0;          // начальное значение ползунка должно задаваться после min и max
    text_01.value = mg / m / g0;
    slider_02.min = 0; slider_02.max = 5;
    slider_02.step = 0.05;
    slider_02.value = TGoal;                // начальное значение ползунка должно задаваться после min и max
    text_02.value = TGoal.toFixed(1);

    // Запуск новой системы

    // следующие переменные должны пересчитываться каждый раз, когда мы изменяем значение Ny
    var scale, w, h;
    var rScale13, rScaleShift;
    this.newSystem = function () {
        scale = canvas.height / Ny / a0;    // масштабный коэффициент для перехода от расчетных к экранным координатам
        w = canvas.width / scale;           // ширина окна в расчетных координатах
        h = canvas.height / scale;          // высота окна в расчетных координатах

        rScale13 = r * scale * 1.3;         // ___в целях оптимизации___
        rScaleShift = r * scale / 5;        // ___в целях оптимизации___

        this.setRandom();                   // задаем случайную конфигурацию
    };

    // Работа с мышью

    var mx_, my_;                               // буфер позиции мыши (для расчета скорости при отпускании шара)

    canvas.onmousedown = function (e) {          // функция при нажатии клавиши мыши
        var m = mouseCoords(e);                 // получаем расчетные координаты курсора мыши
        // цикл в обратную сторону, чтобы захватывать шар, нарисованный "сверху"
        // (т.к. цикл рисования идет в обычном порядке)
        for (var i = balls.length - 1; i >= 0; i--) {
            var b = balls[i];
            var rx = b.x - m.x;
            var ry = b.y - m.y;
            var rLen2 = rx * rx + ry * ry;              // квадрат расстояния между курсором и центром шара
            if (rLen2 <= r2) {                          // курсор нажал на шар
                if (e.which == 1) {                     // нажата левая клавиша мыши
                    dNd = b;
                    dNd.xPlus = dNd.x - m.x;            // сдвиг курсора относительно центра шара по x
                    dNd.yPlus = dNd.y - m.y;            // сдвиг курсора относительно центра шара по y
                    mx_ = m.x; my_ = m.y;
                    canvas.onmousemove = mouseMove;     // пока клавиша нажата - работает функция перемещения
                } else if (e.which == 3)                // нажата правая клавиша мыши
                    balls.splice(i, 1);                 // удалить шар
                return;
            }
        }

        // если не вышли по return из цикла - нажатие было вне шара, добавляем новый
        if (e.which == 1) {
            dNd = addNewBall(m.x, m.y, true);   // добавляем шар и сразу захватываем его курсором
            if (dNd == null) return;            // если шар не добавился (из за стен или других шаров) - возвращаемся
            dNd.xPlus = 0; dNd.yPlus = 0;      // держим шар по центру
            mx_ = m.x; my_ = m.y;
            canvas.onmousemove = mouseMove;     // пока клавиша нажата - работает функция перемещения
        }
    };

    document.onmouseup = function (e) {          // функция при отпускании клавиши мыши
        canvas.onmousemove = null;              // когда клавиша отпущена - функции перемещения нету
        dNd = null;                             // когда клавиша отпущена - захваченного курсором шара нету
    };

    function mouseMove(e) {                     // функция при перемещении мыши, работает только с зажатой ЛКМ
        var m = mouseCoords(e);                 // получаем расчетные координаты курсора мыши
        dNd.x = m.x + dNd.xPlus;
        dNd.y = m.y + dNd.yPlus;
        dNd.vx = 0.6 * (m.x - mx_) / dt / fps; dNd.vy = 0.6 * (m.y - my_) / dt / fps;
        mx_ = m.x; my_ = m.y;
    }

    function mouseCoords(e) {                   // функция возвращает расчетные координаты курсора мыши
        var m = [];
        var rect = canvas.getBoundingClientRect();
        m.x = (e.clientX - rect.left) / scale;
        m.y = (e.clientY - rect.top) / scale;
        return m;
    }

    // Работа с массивом

    var balls = [];                             // массив шаров
    var addNewBall = function (x, y, check) {
        // проверка - не пересекается ли новый шар со стенами или уже существующими шарами
        if (check) {
            if (x - r < 0 || x + r > w || y - r < 0 || y + r > h) return null;
            for (var i = 0; i < balls.length; i++) {
                var rx = balls[i].x - x;
                var ry = balls[i].y - y;
                var rLen2 = rx * rx + ry * ry;
                if (rLen2 < 4 * r2) return null;
            }
        }

        var b = [];

        b.x = x; b.y = y;        // расчетные координаты шара
        b.fx = 0; b.fy = mg;      // сила, действующая на шар
        b.vx = 0; b.vy = 0;       // скорость

        balls[balls.length] = b;                // добавить элемент в конец массива
        return b;
    };

    this.setEmpty = function () { balls = []; };   // пустое поле

    this.setRandom = function () {               // случайная конфигурация
        balls = [];
        for (var i = 0; i < 1000; i++)
            addNewBall(Math.random() * w, Math.random() * h, true);
    };

    var sqrt3 = Math.sqrt(3);
    this.setTriangularLattice = function () {            // задать на поле треугольную решетку
        balls = [];
        var center = (w - Math.floor(w / r) * r) / 2;   // сдвиг, решетка будет появляться по середине по горизонтали
        for (var j = 0; j < Math.floor(h / (sqrt3 * r)); j++)
            for (var i = 0; i < Math.floor(w / r) - 1; i++)
                if ((i + j) % 2 == 0) addNewBall(r * (i + 1) + center, h - r * (1 + sqrt3 * j), false);
    };

    // Основной цикл программы

    function control() {
        physics();
        draw();
    }

    // Расчетная часть программы

    function physics() {                            // то, что происходит каждый шаг времени
        for (var s = 1; s <= spf; s++) {

            var BViscTh = BVisc;
            var BInternalTh = BInternal;
            // работа термостата
            if (thermostatEnabled) {
                if (balls.length > 0) {
                    var v2Sum = 0;
                    for (var i1 = 0; i1 < balls.length; i1++)
                        v2Sum += balls[i1].vx * balls[i1].vx + balls[i1].vy * balls[i1].vy;
                    var v2Average = v2Sum / balls.length;
                    TActual = Tk * v2Average;

                    if (addRandomV) {               // случайные скорости, если температура слишком мала
                        if (TGoal > 0.15 && TActual < 0.1) {
                            for (var i2 = 0; i2 < balls.length; i2++) {
                                balls[i2].vx += 0.3 * (1 - 2 * Math.random());
                                balls[i2].vy += 0.3 * (1 - 2 * Math.random());
                            }
                        }
                    }

                    if (TActual < TActualMax) {         // из за того, что мышкой можно задать шарам запредельную скорость
                        if (viscFrictionTh) BViscTh = BVisc * (TActual - TGoal);                // действие термостата
                        if (internalFrictionTh) BInternalTh = BInternal * (TActual - TGoal);    // действие термостата
                    }
                } else
                    TActual = 0;                        // для датчика температуры на странице
            }

            // пересчет сил идет отдельным массивом, т.к. далее будут добавляться силы взаимодействия между шарами
            for (var i0 = 0; i0 < balls.length; i0++) {
                balls[i0].fx = - BViscTh * balls[i0].vx;
                balls[i0].fy = mg - BViscTh * balls[i0].vy;
            }

            for (var i = 0; i < balls.length; i++) {
                // расчет взаимодействия производится со всеми следующими шарами в массиве,
                // чтобы не считать каждое взаимодействие дважды
                var b = balls[i];
                for (var j = i + 1; j < balls.length; j++) {
                    var b2 = balls[j];
                    var rx = b.x - b2.x; var ry = b.y - b2.y;         // вектор смотрит на первый шар (b)
                    var r2 = rx * rx + ry * ry;                         // квадрат расстояния между шарами
                    var rLen = (Math.sqrt(r2));
                    if (rLen > aCut) continue;                          // проверка на радиус обрезания

                    // если расстояние между частицами мало, силы будут посчитаны для K * a
                    if (rLen < Ka) {
                        if (rLen > 0.00001) {                           // проверка, чтобы избежать деления на 0
                            rx = rx / rLen * Ka;
                            ry = ry / rLen * Ka;
                        }
                        r2 = K2a2;
                        rLen = Ka;                                      // корень K2a2
                    }

                    // сила взаимодействия
                    var s2 = a2 / r2; var s4 = s2 * s2;         // ___в целях оптимизации___
                    var F = LJCoeff * s4 * s4 * (s4 * s2 - 1);          // сила взаимодействия Леннарда-Джонса
                    if (SLJEnabled) {
                        var kSLJ;                                           // k(r) - сглаживающий коэффициент SLJ потенциала
                        if (r <= b) kSLJ = 1;
                        else {
                            var brackets = (r2 - b2) * SLJDenominator;
                            kSLJ = 1 - brackets * brackets;
                        }                                                   // случай rLen > aCut обработан выше
                        F *= kSLJ;
                    }

                    // сила внутреннего трения между частицами
                    if (r2 < a2) {
                        var vx21 = b.vx - b2.vx; var vy21 = b.vy - b2.vy;    // вектор смотрит на первый шар (b)
                        var ex = rx / rLen; var ey = ry / rLen;
                        var v = vx21 * ex + vy21 * ey;
                        F -= F * BInternalTh / rLen * v;
                    }

                    // суммируем силы
                    var Fx = F * rx; var Fy = F * ry;

                    b.fx += Fx; b.fy += Fy;
                    b2.fx -= Fx; b2.fy -= Fy;
                }

                if (b == dNd) continue;  // если шар схвачен курсором - его вз. со стенами и перемещение не считаем

                if (b.y + r > h) { b.fy += -CWall * (b.y + r - h) - BWall * b.vy; }
                if (b.y - r < 0) { b.fy += -CWall * (b.y - r) - BWall * b.vy; }
                if (b.x + r > w) { b.fx += -CWall * (b.x + r - w) - BWall * b.vx; }
                if (b.x - r < 0) { b.fx += -CWall * (b.x - r) - BWall * b.vx; }

                b.vx += b.fx / m * dt; b.vy += b.fy / m * dt;
                b.x += b.vx * dt; b.y += b.vy * dt;
            }
        }
    }

    // Рисование
    function draw() {
        context.clearRect(0, 0, w * scale, h * scale);      // очистить экран
        for (var i = 0; i < balls.length; i++) {
            var xS = balls[i].x * scale; var yS = balls[i].y * scale;
            if (grad) {
                // расчет градиента нужно проводить для каждого шара
                var gradient = context.createRadialGradient(xS, yS, rScale13, xS - rScaleShift, yS + rScaleShift, 0);
                gradient.addColorStop(0, "#0000bb");
                gradient.addColorStop(1, "#44ddff");
                context.fillStyle = gradient;
            }

            context.beginPath();
            context.arc(xS, yS, r * scale, 0, 2 * Math.PI, false);
            context.closePath();
            context.fill();
        }
    }

    // Запуск системы
    this.newSystem();
    setInterval(control, 1000 / fps);
    // след. функция обновляет информацию о количестве частиц на поле
    setInterval(function () { document.getElementById('ballsNum').innerHTML = balls.length; }, 1000 / 20);
}